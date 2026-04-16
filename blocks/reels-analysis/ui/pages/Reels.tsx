import { useEffect, useMemo, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "../../../../ui/src/lib/router";
import { useBreadcrumbs } from "../../../../ui/src/context/BreadcrumbContext";
import { reelsAnalysisApi, type ReelItem } from "../api";
import { DataTable, type DataTableColumn } from "../../../../ui/src/components/DataTable";
import { SearchFilterBar, type FilterConfig } from "../../../../ui/src/components/SearchFilterBar";
import { PageSkeleton } from "../../../../ui/src/components/PageSkeleton";
import { StatusBadge } from "../../../../ui/src/components/StatusBadge";
import { Button } from "../../../../ui/src/components/ui/button";
import { Film, Plus, Loader2 } from "lucide-react";

const STATUSES = ["saved", "analyzed", "used"];

const statusFilters: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    allLabel: "All statuses",
    options: STATUSES.map((s) => ({
      value: s,
      label: s.replace(/\b\w/g, (c) => c.toUpperCase()),
    })),
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function truncate(text: string | null, max: number): string {
  if (!text) return "\u2014";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

const columns: DataTableColumn<ReelItem>[] = [
  {
    key: "shortcode",
    header: "Reel",
    render: (item) => (
      <span className="font-medium">{item.shortcode ?? item.author ?? "Reel"}</span>
    ),
  },
  {
    key: "transcript",
    header: "Transcript",
    render: (item) => (
      <span className="text-muted-foreground">{truncate(item.transcript, 80)}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (item) => <StatusBadge status={item.status} />,
  },
  {
    key: "tags",
    header: "Tags",
    render: (item) =>
      item.tags.length > 0 ? (
        <div className="flex gap-1 flex-wrap">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">{"\u2014"}</span>
      ),
  },
  {
    key: "created",
    header: "Created",
    render: (item) => (
      <span className="text-xs text-muted-foreground">
        {formatDate(item.createdAt)}
      </span>
    ),
  },
];

export default function Reels() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);

  const statusFilter = searchParams.get("status") ?? "__all__";
  const search = searchParams.get("q") ?? "";

  const setStatusFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value === "__all__") next.delete(key);
        else next.set(key, value);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (!value) next.delete("q");
        else next.set("q", value);
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("status");
      next.delete("q");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    setBreadcrumbs([{ label: "Reels Analysis" }, { label: "Reels" }]);
  }, [setBreadcrumbs]);

  const query = useQuery({
    queryKey: ["reels-analysis", "reels", statusFilter],
    queryFn: () =>
      reelsAnalysisApi.listReels(
        statusFilter !== "__all__" ? { status: statusFilter } : undefined,
      ),
  });

  const createMutation = useMutation({
    mutationFn: (data: { url: string }) => reelsAnalysisApi.createReel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reels-analysis", "reels"] });
      setSaving(false);
    },
    onError: () => {
      setSaving(false);
    },
  });

  const filteredData = useMemo(() => {
    if (!query.data) return [];
    if (!search) return query.data;
    const q = search.toLowerCase();
    return query.data.filter(
      (item) =>
        item.transcript?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q) ||
        item.author?.toLowerCase().includes(q) ||
        item.shortcode?.toLowerCase().includes(q),
    );
  }, [query.data, search]);

  const hasActiveFilters = statusFilter !== "__all__" || search !== "";

  if (query.isLoading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reels</h1>
        <Button
          size="sm"
          disabled={saving}
          onClick={() => {
            const url = window.prompt("Instagram reel URL:");
            if (url) {
              setSaving(true);
              createMutation.mutate({ url });
            }
          }}
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Fetching transcript...
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Save Reel
            </>
          )}
        </Button>
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reels..."
        filters={statusFilters}
        filterValues={{ status: statusFilter }}
        onFilterChange={setStatusFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        onRowClick={(item) => navigate(`/reels-analysis/reels/${item.id}`)}
        emptyMessage="No reels saved yet."
        emptyIcon={Film}
      />
    </div>
  );
}
