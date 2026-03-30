import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "../../../../ui/src/lib/router";
import { useBreadcrumbs } from "../../../../ui/src/context/BreadcrumbContext";
import { starterApi, type StarterItem } from "../api";
import { KanbanBoard } from "../../../../ui/src/components/KanbanBoard";
import { StatusBadge } from "../../../../ui/src/components/StatusBadge";
import { PageSkeleton } from "../../../../ui/src/components/PageSkeleton";

const BOARD_STATUSES = ["backlog", "todo", "in_progress", "done", "archived"];

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Board() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBreadcrumbs([{ label: "Starter" }, { label: "Board" }]);
  }, [setBreadcrumbs]);

  const query = useQuery({
    queryKey: ["starter", "items"],
    queryFn: () => starterApi.listItems(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      starterApi.updateItemStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starter", "items"] });
    },
  });

  if (query.isLoading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Board</h1>

      <KanbanBoard<StarterItem>
        items={query.data ?? []}
        statuses={BOARD_STATUSES}
        getStatus={(item) => item.status}
        onStatusChange={(id, newStatus) => statusMutation.mutate({ id, status: newStatus })}
        renderCard={(item, { isDragging }) => (
          <button
            className="w-full text-left"
            onClick={() => {
              if (!isDragging) navigate(`/starter/items/${item.id}`);
            }}
          >
            <p className="text-sm font-medium truncate">{item.name}</p>
            {item.category && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {item.category}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-muted-foreground">
                {item.priority}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {timeAgo(item.createdAt)}
              </span>
            </div>
          </button>
        )}
      />
    </div>
  );
}
