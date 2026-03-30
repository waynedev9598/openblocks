import { Link } from "@/lib/router";
import { StatusIcon } from "./StatusIcon";
import { PriorityIcon } from "./PriorityIcon";
import { Identity } from "./Identity";
import { KanbanBoard } from "./KanbanBoard";
import type { Issue } from "@openblock/shared";

const boardStatuses = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
];

interface Agent {
  id: string;
  name: string;
}

interface IssueKanbanBoardProps {
  issues: Issue[];
  agents?: Agent[];
  liveIssueIds?: Set<string>;
  onUpdateIssue: (id: string, data: Record<string, unknown>) => void;
}

export function IssueKanbanBoard({
  issues,
  agents,
  liveIssueIds,
  onUpdateIssue,
}: IssueKanbanBoardProps) {
  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  return (
    <KanbanBoard
      items={issues}
      statuses={boardStatuses}
      getStatus={(issue) => issue.status}
      onStatusChange={(id, newStatus) => onUpdateIssue(id, { status: newStatus })}
      statusIcon={(status) => <StatusIcon status={status} />}
      renderCard={(issue, { isDragging }) => (
        <Link
          to={`/issues/${issue.identifier ?? issue.id}`}
          className="block no-underline text-inherit"
          onClick={(e) => {
            if (isDragging) e.preventDefault();
          }}
        >
          <div className="flex items-start gap-1.5 mb-1.5">
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {issue.identifier ?? issue.id.slice(0, 8)}
            </span>
            {liveIssueIds?.has(issue.id) && (
              <span className="relative flex h-2 w-2 shrink-0 mt-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}
          </div>
          <p className="text-sm leading-snug line-clamp-2 mb-2">{issue.title}</p>
          <div className="flex items-center gap-2">
            <PriorityIcon priority={issue.priority} />
            {issue.assigneeAgentId && (() => {
              const name = agentName(issue.assigneeAgentId);
              return name ? (
                <Identity name={name} size="xs" />
              ) : (
                <span className="text-xs text-muted-foreground font-mono">
                  {issue.assigneeAgentId.slice(0, 8)}
                </span>
              );
            })()}
          </div>
        </Link>
      )}
    />
  );
}
