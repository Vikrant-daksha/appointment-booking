import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, Sparkles } from "lucide-react";

export interface SortableImageItem {
  id: string;
  url: string;
  file?: File;
  isExisting?: boolean;
  name?: string;
  size?: number;
}

interface SortableImageCardProps {
  item: SortableImageItem;
  index: number;
  onRemove: (id: string) => void;
  isDraggingOverlay?: boolean;
}

function SortableImageCard({
  item,
  index,
  onRemove,
  isDraggingOverlay = false,
}: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square rounded-2xl overflow-hidden border bg-neutral-100 shadow-2xs transition-shadow select-none ${
        isDragging
          ? "border-[#E2B4BD] ring-2 ring-[#E2B4BD]/40 z-20"
          : isDraggingOverlay
          ? "border-[#E2B4BD] shadow-xl ring-2 ring-[#E2B4BD] scale-105 z-50 cursor-grabbing"
          : "border-neutral-200 hover:border-neutral-300 hover:shadow-xs"
      }`}
    >
      {/* Draggable Surface */}
      <div
        {...attributes}
        {...listeners}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Drag to rearrange image order"
      >
        <img
          src={item.url}
          alt={item.name || `Image ${index + 1}`}
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* Drag handle icon on hover */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-xs flex items-center gap-1 text-[11px] font-medium">
            <GripVertical className="w-3.5 h-3.5" />
            <span>Drag</span>
          </div>
        </div>
      </div>

      {/* Position Badge in Top-Left */}
      <div className="absolute top-1.5 left-1.5 pointer-events-none z-10">
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs flex items-center gap-1 ${
            index === 0
              ? "bg-[#E2B4BD] text-white"
              : "bg-black/65 text-white backdrop-blur-xs"
          }`}
        >
          {index === 0 ? "Cover" : `#${index + 1}`}
        </span>
      </div>

      {/* Delete / Remove Button in Top-Right */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove(item.id);
        }}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/65 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-xs z-10 cursor-pointer"
        title="Delete image"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Metadata bar at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-3 flex items-center justify-between text-[10px] text-white pointer-events-none z-10">
        <span className="truncate max-w-[80%] font-medium">
          {item.name || (item.isExisting ? "Cloudinary" : "New upload")}
        </span>
        {item.size ? (
          <span className="opacity-80 shrink-0 text-[9px]">
            {(item.size / (1024 * 1024)).toFixed(1)}MB
          </span>
        ) : null}
      </div>
    </div>
  );
}

export interface SortableImageGridProps {
  items: SortableImageItem[];
  onReorder: (newItems: SortableImageItem[]) => void;
  onRemove: (id: string) => void;
  maxItems?: number;
}

export function SortableImageGrid({
  items,
  onReorder,
  onRemove,
  maxItems = 10,
}: SortableImageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Require small pointer distance before initiating drag so clicks on buttons don't drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(arrayMove(items, oldIndex, newIndex));
      }
    }
    setActiveId(null);
  };

  const activeItem = activeId
    ? items.find((item) => item.id === activeId)
    : null;
  const activeIndex = activeItem
    ? items.findIndex((i) => i.id === activeItem.id)
    : 0;

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#E2B4BD]" />
          <span>Showcase Photos ({items.length}{maxItems ? ` / ${maxItems}` : ""})</span>
        </span>
        <span className="text-[11px] text-neutral-400">
          Drag to rearrange • First image is cover
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((it) => it.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {items.map((item, idx) => (
              <SortableImageCard
                key={item.id}
                item={item}
                index={idx}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeItem ? (
            <SortableImageCard
              item={activeItem}
              index={activeIndex}
              onRemove={onRemove}
              isDraggingOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

export default SortableImageGrid;

