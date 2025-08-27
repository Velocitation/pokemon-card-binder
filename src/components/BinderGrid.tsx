import React, { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import type { BinderLayout } from "../types/Binder";
import type { PokemonCard } from "../types/Card";
import BinderSlot from "./BinderSlot";
import "../styles/BinderGrid.css";

interface BinderGridProps {
  binder: BinderLayout;
  onBinderUpdate: (updatedBinder: BinderLayout) => void;
  cards: Map<string, PokemonCard>; // Map of cardId to PokemonCard
}

const BinderGrid: React.FC<BinderGridProps> = ({
  binder,
  onBinderUpdate,
  cards,
}) => {
  const [activeCard, setActiveCard] = useState<PokemonCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const slotIds = useMemo(
    () => binder.cardPositions.map((_, index) => `slot-${index}`),
    [binder.cardPositions]
  );

  const handleDragStart = (event: any) => {
    const slotIndex = parseInt(event.active.id.split("-")[1]);
    const position = binder.cardPositions[slotIndex];
    if (position.cardId) {
      setActiveCard(cards.get(position.cardId) || null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = parseInt(active.id.toString().split("-")[1]);
    const overIndex = parseInt(over.id.toString().split("-")[1]);

    if (activeIndex === overIndex) return;

    const newCardPositions = [...binder.cardPositions];

    // Swap the card IDs
    const temp = newCardPositions[activeIndex].cardId;
    newCardPositions[activeIndex] = {
      ...newCardPositions[activeIndex],
      cardId: newCardPositions[overIndex].cardId,
      isEmpty: !newCardPositions[overIndex].cardId,
    };
    newCardPositions[overIndex] = {
      ...newCardPositions[overIndex],
      cardId: temp,
      isEmpty: !temp,
    };

    onBinderUpdate({
      ...binder,
      cardPositions: newCardPositions,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveCard = (slotId: string) => {
    const slotIndex = parseInt(slotId.split("-")[1]);
    const newCardPositions = [...binder.cardPositions];
    newCardPositions[slotIndex] = {
      ...newCardPositions[slotIndex],
      cardId: null,
      isEmpty: true,
    };

    onBinderUpdate({
      ...binder,
      cardPositions: newCardPositions,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="binder-container">
      <div className="binder-header">
        <h2>{binder.name}</h2>
        <span className="binder-info">
          {binder.dimensions.rows}×{binder.dimensions.cols} • {binder.template}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={slotIds} strategy={rectSortingStrategy}>
          <div
            className="binder-grid"
            style={{
              gridTemplateColumns: `repeat(${binder.dimensions.cols}, 1fr)`,
              gridTemplateRows: `repeat(${binder.dimensions.rows}, 1fr)`,
            }}
          >
            {binder.cardPositions.map((position, index) => {
              const slotId = `slot-${index}`;
              const card = position.cardId
                ? cards.get(position.cardId) || null
                : null;

              return (
                <BinderSlot
                  key={slotId}
                  id={slotId}
                  card={card}
                  onRemoveCard={handleRemoveCard}
                />
              );
            })}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard ? (
            <div className="drag-overlay">
              <img src={activeCard.images.small} alt={activeCard.name} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default BinderGrid;
