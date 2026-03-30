import { useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

function defaultStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface KanbanBoardProps<T extends { id: string }> {
  items: T[];
  statuses: string[];
  getStatus: (item: T) => string;
  onStatusChange: (id: string, newStatus: string) => void;
  renderCard: (item: T, opts: { isDragging: boolean; isOverlay: boolean }) => ReactNode;
  statusLabel?: (status: string) => string;
  statusIcon?: (status: string) => ReactNode;
  columnWidth?: number;
}

/* ── Droppable Column ── */

function KanbanColumn<T extends { id: string }>({
  status,
  items,
  statusLabel,
  statusIcon,
  renderCard,
  columnWidth = 260,
}: {
  status: string;
  items: T[];
  statusLabel: (status: string) => string;
  statusIcon?: (status: string) => ReactNode;
  renderCard: (item: T, opts: { isDragging: boolean; isOverlay: boolean }) => ReactNode;
  columnWidth?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col shrink-0" style={{ minWidth: columnWidth, width: columnWidth }}>
      <div className="flex items-center gap-2 px-2 py-2 mb-1">
        {statusIcon?.(status)}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {statusLabel(status)}
        </span>
        <span className="text-xs text-muted-foreground/60 ml-auto tabular-nums">
          {items.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] rounded-md p-1 space-y-1 transition-colors ${
          isOver ? "bg-accent/40" : "bg-muted/20"
        }`}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <KanbanCardWrapper
              key={item.id}
              item={item}
              renderCard={renderCard}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

/* ── Draggable Card Wrapper ── */

function KanbanCardWrapper<T extends { id: string }>({
  item,
  renderCard,
  isOverlay,
}: {
  item: T;
  renderCard: (item: T, opts: { isDragging: boolean; isOverlay: boolean }) => ReactNode;
  isOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, data: { item } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing transition-shadow ${
        isDragging && !isOverlay ? "opacity-30" : ""
      } ${isOverlay ? "shadow-lg ring-1 ring-primary/20" : "hover:shadow-sm"}`}
    >
      {renderCard(item, { isDragging: isDragging && !isOverlay, isOverlay: !!isOverlay })}
    </div>
  );
}

/* ── Main Board ── */

export function KanbanBoard<T extends { id: string }>({
  items,
  statuses,
  getStatus,
  onStatusChange,
  renderCard,
  statusLabel = defaultStatusLabel,
  statusIcon,
  columnWidth,
}: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnItems = useMemo(() => {
    const grouped: Record<string, T[]> = {};
    for (const status of statuses) {
      grouped[status] = [];
    }
    for (const item of items) {
      const s = getStatus(item);
      if (grouped[s]) {
        grouped[s].push(item);
      }
    }
    return grouped;
  }, [items, statuses, getStatus]);

  const activeItem = useMemo(
    () => (activeId ? items.find((i) => i.id === activeId) : null),
    [activeId, items]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = active.id as string;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    let targetStatus: string | null = null;

    if (statuses.includes(over.id as string)) {
      targetStatus = over.id as string;
    } else {
      const targetItem = items.find((i) => i.id === over.id);
      if (targetItem) {
        targetStatus = getStatus(targetItem);
      }
    }

    if (targetStatus && targetStatus !== getStatus(item)) {
      onStatusChange(itemId, targetStatus);
    }
  }

  function handleDragOver(_event: DragOverEvent) {
    // Could be used for visual feedback
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
        {statuses.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            items={columnItems[status] ?? []}
            statusLabel={statusLabel}
            statusIcon={statusIcon}
            renderCard={renderCard}
            columnWidth={columnWidth}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <KanbanCardWrapper item={activeItem} renderCard={renderCard} isOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
