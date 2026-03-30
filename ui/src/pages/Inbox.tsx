import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { issuesApi } from "../api/issues";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { StatusIcon } from "../components/StatusIcon";
import { PriorityIcon } from "../components/PriorityIcon";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { timeAgo } from "../lib/timeAgo";
import { Separator } from "@/components/ui/separator";
import { Tabs } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Inbox as InboxIcon,
  Clock,
  X,
} from "lucide-react";
import { PageTabBar } from "../components/PageTabBar";
import type { Issue } from "@openblock/shared";

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours
const RECENT_ISSUES_LIMIT = 100;

type InboxTab = "new" | "all";
type InboxCategoryFilter =
  | "everything"
  | "issues_i_touched"
  | "stale_work";
type SectionKey =
  | "issues_i_touched"
  | "stale_work";

const DISMISSED_KEY = "openblock:inbox:dismissed";

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

function useDismissedItems() {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  return { dismissed, dismiss };
}

function getStaleIssues(issues: Issue[]): Issue[] {
  const now = Date.now();
  return issues
    .filter(
      (i) =>
        ["in_progress", "todo"].includes(i.status) &&
        now - new Date(i.updatedAt).getTime() > STALE_THRESHOLD_MS,
    )
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
}

function normalizeTimestamp(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function issueLastActivityTimestamp(issue: Issue): number {
  const lastExternalCommentAt = normalizeTimestamp(issue.lastExternalCommentAt);
  if (lastExternalCommentAt > 0) return lastExternalCommentAt;

  const updatedAt = normalizeTimestamp(issue.updatedAt);
  const myLastTouchAt = normalizeTimestamp(issue.myLastTouchAt);
  if (myLastTouchAt > 0 && updatedAt <= myLastTouchAt) return 0;

  return updatedAt;
}

export function Inbox() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [allCategoryFilter, setAllCategoryFilter] = useState<InboxCategoryFilter>("everything");
  const { dismissed, dismiss } = useDismissedItems();

  const pathSegment = location.pathname.split("/").pop() ?? "new";
  const tab: InboxTab = pathSegment === "all" ? "all" : "new";

  useEffect(() => {
    setBreadcrumbs([{ label: "Inbox" }]);
  }, [setBreadcrumbs]);

  const { data: issues, isLoading: isIssuesLoading } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const {
    data: touchedIssuesRaw = [],
    isLoading: isTouchedIssuesLoading,
  } = useQuery({
    queryKey: queryKeys.issues.listTouchedByMe(selectedCompanyId!),
    queryFn: () =>
      issuesApi.list(selectedCompanyId!, {
        touchedByUserId: "me",
        status: "backlog,todo,in_progress,in_review,blocked,done",
      }),
    enabled: !!selectedCompanyId,
  });

  const staleIssues = useMemo(
    () => (issues ? getStaleIssues(issues) : []).filter((i) => !dismissed.has(`stale:${i.id}`)),
    [issues, dismissed],
  );

  const sortByMostRecentActivity = useCallback(
    (a: Issue, b: Issue) => {
      const activityDiff = issueLastActivityTimestamp(b) - issueLastActivityTimestamp(a);
      if (activityDiff !== 0) return activityDiff;
      return normalizeTimestamp(b.updatedAt) - normalizeTimestamp(a.updatedAt);
    },
    [],
  );

  const touchedIssues = useMemo(
    () => [...touchedIssuesRaw].sort(sortByMostRecentActivity).slice(0, RECENT_ISSUES_LIMIT),
    [sortByMostRecentActivity, touchedIssuesRaw],
  );

  const hasStale = staleIssues.length > 0;
  const hasTouchedIssues = touchedIssues.length > 0;

  const showTouchedCategory =
    allCategoryFilter === "everything" || allCategoryFilter === "issues_i_touched";
  const showStaleCategory = allCategoryFilter === "everything" || allCategoryFilter === "stale_work";

  const showTouchedSection = tab === "new" ? hasTouchedIssues : showTouchedCategory && hasTouchedIssues;
  const showStaleSection = tab === "new" ? hasStale : showStaleCategory && hasStale;

  const visibleSections = [
    showStaleSection ? "stale_work" : null,
    showTouchedSection ? "issues_i_touched" : null,
  ].filter((key): key is SectionKey => key !== null);

  const allLoaded = !isIssuesLoading && !isTouchedIssuesLoading;

  const showSeparatorBefore = (key: SectionKey) => visibleSections.indexOf(key) > 0;

  const [fadingOutIssues, setFadingOutIssues] = useState<Set<string>>(new Set());

  const markReadMutation = useMutation({
    mutationFn: (id: string) => issuesApi.markRead(id),
    onMutate: (id) => {
      setFadingOutIssues((prev) => new Set(prev).add(id));
    },
    onSuccess: () => {
      if (selectedCompanyId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.listTouchedByMe(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.listUnreadTouchedByMe(selectedCompanyId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.sidebarBadges(selectedCompanyId) });
      }
    },
    onSettled: (_data, _error, id) => {
      setTimeout(() => {
        setFadingOutIssues((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 300);
    },
  });

  if (!selectedCompanyId) {
    return <EmptyState icon={InboxIcon} message="Select a workspace to view inbox." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onValueChange={(value) => navigate(`/inbox/${value === "all" ? "all" : "new"}`)}>
          <PageTabBar
            items={[
              { value: "new", label: "New" },
              { value: "all", label: "All" },
            ]}
          />
        </Tabs>

        {tab === "all" && (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={allCategoryFilter}
              onValueChange={(value) => setAllCategoryFilter(value as InboxCategoryFilter)}
            >
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everything">All categories</SelectItem>
                <SelectItem value="issues_i_touched">My recent issues</SelectItem>
                <SelectItem value="stale_work">Stale work</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {!allLoaded && visibleSections.length === 0 && (
        <PageSkeleton variant="inbox" />
      )}

      {allLoaded && visibleSections.length === 0 && (
        <EmptyState
          icon={InboxIcon}
          message={
            tab === "new"
              ? "No issues you're involved in yet."
              : "No inbox items match these filters."
          }
        />
      )}

      {showStaleSection && (
        <>
          {showSeparatorBefore("stale_work") && <Separator />}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Stale Work
            </h3>
            <div className="divide-y divide-border border border-border">
              {staleIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="group/stale relative flex items-start gap-2 overflow-hidden px-3 py-3 transition-colors hover:bg-accent/50 sm:items-center sm:gap-3 sm:px-4"
                >
                  <span className="shrink-0 sm:hidden">
                    <StatusIcon status={issue.status} />
                  </span>
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground hidden sm:block sm:mt-0" />

                  <Link
                    to={`/issues/${issue.identifier ?? issue.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 no-underline text-inherit sm:flex-row sm:items-center sm:gap-3"
                  >
                    <span className="line-clamp-2 text-sm sm:order-2 sm:flex-1 sm:min-w-0 sm:line-clamp-none sm:truncate">
                      {issue.title}
                    </span>
                    <span className="flex items-center gap-2 sm:order-1 sm:shrink-0">
                      <span className="hidden sm:inline-flex"><PriorityIcon priority={issue.priority} /></span>
                      <span className="hidden sm:inline-flex"><StatusIcon status={issue.status} /></span>
                      <span className="shrink-0 text-xs font-mono text-muted-foreground">
                        {issue.identifier ?? issue.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-muted-foreground sm:hidden">&middot;</span>
                      <span className="shrink-0 text-xs text-muted-foreground sm:order-last">
                        updated {timeAgo(issue.updatedAt)}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => dismiss(`stale:${issue.id}`)}
                    className="mt-0.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/stale:opacity-100 sm:mt-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showTouchedSection && (
        <>
          {showSeparatorBefore("issues_i_touched") && <Separator />}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              My Recent Issues
            </h3>
            <div className="divide-y divide-border border border-border">
              {touchedIssues.map((issue) => {
                const isUnread = issue.isUnreadForMe && !fadingOutIssues.has(issue.id);
                const isFading = fadingOutIssues.has(issue.id);
                return (
                  <Link
                    key={issue.id}
                    to={`/issues/${issue.identifier ?? issue.id}`}
                    className="flex min-w-0 cursor-pointer items-start gap-2 px-3 py-3 no-underline text-inherit transition-colors hover:bg-accent/50 sm:items-center sm:gap-3 sm:px-4"
                  >
                    <span className="shrink-0 sm:hidden">
                      <StatusIcon status={issue.status} />
                    </span>

                    <span className="flex min-w-0 flex-1 flex-col gap-1 sm:contents">
                      <span className="line-clamp-2 text-sm sm:order-2 sm:flex-1 sm:min-w-0 sm:line-clamp-none sm:truncate">
                        {issue.title}
                      </span>
                      <span className="flex items-center gap-2 sm:order-1 sm:shrink-0">
                        {(isUnread || isFading) ? (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markReadMutation.mutate(issue.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                markReadMutation.mutate(issue.id);
                              }
                            }}
                            className="hidden sm:inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-blue-500/20"
                            aria-label="Mark as read"
                          >
                            <span
                              className={`h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-opacity duration-300 ${
                                isFading ? "opacity-0" : "opacity-100"
                              }`}
                            />
                          </span>
                        ) : (
                          <span className="hidden sm:inline-flex h-4 w-4 shrink-0" />
                        )}
                        <span className="hidden sm:inline-flex"><PriorityIcon priority={issue.priority} /></span>
                        <span className="hidden sm:inline-flex"><StatusIcon status={issue.status} /></span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {issue.identifier ?? issue.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground sm:hidden">
                          &middot;
                        </span>
                        <span className="text-xs text-muted-foreground sm:order-last">
                          {issue.lastExternalCommentAt
                            ? `commented ${timeAgo(issue.lastExternalCommentAt)}`
                            : `updated ${timeAgo(issue.updatedAt)}`}
                        </span>
                      </span>
                    </span>

                    {(isUnread || isFading) && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markReadMutation.mutate(issue.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            markReadMutation.mutate(issue.id);
                          }
                        }}
                        className="shrink-0 self-center cursor-pointer sm:hidden"
                        aria-label="Mark as read"
                      >
                        <span
                          className={`block h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 transition-opacity duration-300 ${
                            isFading ? "opacity-0" : "opacity-100"
                          }`}
                        />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
