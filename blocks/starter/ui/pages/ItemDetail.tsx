import { useEffect } from "react";
import { useParams } from "../../../../ui/src/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "../../../../ui/src/lib/router";
import { useBreadcrumbs } from "../../../../ui/src/context/BreadcrumbContext";
import { starterApi } from "../api";
import { StatusBadge } from "../../../../ui/src/components/StatusBadge";
import { PageSkeleton } from "../../../../ui/src/components/PageSkeleton";
import { EmptyState } from "../../../../ui/src/components/EmptyState";
import { Button } from "../../../../ui/src/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../../ui/src/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../../ui/src/components/ui/select";
import { ArrowLeft, FileText, Clock } from "lucide-react";

const STATUSES = ["backlog", "todo", "in_progress", "done", "archived"];
const PRIORITIES = ["low", "medium", "high", "critical"];

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

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setBreadcrumbs } = useBreadcrumbs();

  const itemQuery = useQuery({
    queryKey: ["starter", "items", "detail", id],
    queryFn: () => starterApi.getItem(id!),
    enabled: !!id,
  });

  const eventsQuery = useQuery({
    queryKey: ["starter", "items", "events", id],
    queryFn: () => starterApi.listItemEvents(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      starterApi.updateItem(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starter", "items"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => starterApi.deleteItem(id!),
    onSuccess: () => {
      navigate("/starter/items");
    },
  });

  useEffect(() => {
    if (itemQuery.data) {
      setBreadcrumbs([
        { label: "Starter" },
        { label: "Items", href: "/starter/items" },
        { label: itemQuery.data.name },
      ]);
    }
  }, [itemQuery.data, setBreadcrumbs]);

  if (itemQuery.isLoading) return <PageSkeleton variant="detail" />;
  if (!itemQuery.data) return <EmptyState icon={FileText} message="Item not found." />;

  const item = itemQuery.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate("/starter/items")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{item.name}</h1>
          <p className="text-xs text-muted-foreground">
            Created {timeAgo(item.createdAt)}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">
            Events
            {eventsQuery.data && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({eventsQuery.data.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Properties */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-medium">Properties</h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Select
                    value={item.status}
                    onValueChange={(status) => updateMutation.mutate({ status })}
                  >
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority</span>
                  <Select
                    value={item.priority}
                    onValueChange={(priority) => updateMutation.mutate({ priority })}
                  >
                    <SelectTrigger size="sm" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p.replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Category</span>
                  <span className="text-sm">{item.category ?? "\u2014"}</span>
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm("Delete this item?")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                Delete Item
              </Button>
            </div>

            {/* Description */}
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {item.description || "No description."}
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Events tab */}
        <TabsContent value="events" className="mt-4">
          {eventsQuery.isLoading ? (
            <PageSkeleton variant="list" />
          ) : !eventsQuery.data?.length ? (
            <EmptyState icon={Clock} message="No events yet." />
          ) : (
            <div className="space-y-2">
              {eventsQuery.data.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 rounded-md border border-border p-3"
                >
                  <div className="mt-0.5">
                    <StatusBadge status={event.eventType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{event.summary ?? event.eventType}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(event.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
