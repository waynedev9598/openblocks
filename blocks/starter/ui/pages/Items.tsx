import { useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "../../../../ui/src/lib/router";
import { useBreadcrumbs } from "../../../../ui/src/context/BreadcrumbContext";
import { starterApi, type StarterItem } from "../api";
import { DataTable, type DataTableColumn } from "../../../../ui/src/components/DataTable";
import { SearchFilterBar, type FilterConfig } from "../../../../ui/src/components/SearchFilterBar";
import { PageSkeleton } from "../../../../ui/src/components/PageSkeleton";
import { StatusBadge } from "../../../../ui/src/components/StatusBadge";
import { Button } from "../../../../ui/src/components/ui/button";
import { List, Plus } from "lucide-react";

const STATUSES = ["backlog", "todo", "in_progress", "done", "archived"];
const PRIORITIES = ["low", "medium", "high", "critical"];

const statusFilters: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    allLabel: "All statuses",
    options: STATUSES.map((s) => ({
      value: s,
      label: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
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

const columns: DataTableColumn<StarterItem>[] = [
  {
    key: "name",
    header: "Name",
    render: (item) => <span className="font-medium">{item.name}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (item) => <StatusBadge status={item.status} />,
  },
  {
    key: "priority",
    header: "Priority",
    render: (item) => (
      <span className="text-xs">
        {item.priority.replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    ),
  },
  {
    key: "category",
    header: "Category",
    render: (item) => (
      <span className="text-muted-foreground">{item.category ?? "\u2014"}</span>
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

export default function Items() {
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

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
    setBreadcrumbs([{ label: "Starter" }, { label: "Items" }]);
  }, [setBreadcrumbs]);

  const query = useQuery({
    queryKey: ["starter", "items", statusFilter],
    queryFn: () =>
      starterApi.listItems(
        statusFilter !== "__all__" ? { status: statusFilter } : undefined,
      ),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string }) => starterApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["starter", "items"] });
    },
  });

  const filteredData = useMemo(() => {
    if (!query.data) return [];
    if (!search) return query.data;
    const q = search.toLowerCase();
    return query.data.filter((item) => item.name.toLowerCase().includes(q));
  }, [query.data, search]);

  const hasActiveFilters = statusFilter !== "__all__" || search !== "";

  if (query.isLoading) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Items</h1>
        <Button
          size="sm"
          onClick={() => {
            const name = window.prompt("Item name:");
            if (name) createMutation.mutate({ name });
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Item
        </Button>
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search items..."
        filters={statusFilters}
        filterValues={{ status: statusFilter }}
        onFilterChange={setStatusFilter}
        onClear={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      <DataTable
        data={filteredData}
        columns={columns}
        onRowClick={(item) => navigate(`/starter/items/${item.id}`)}
        emptyMessage="No items match your filters."
        emptyIcon={List}
      />
    </div>
  );
}
