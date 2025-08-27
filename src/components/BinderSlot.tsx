import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import type { PokemonCard } from "../types/Card";
import "../styles/BinderSlot.css";

interface BinderSlotProps {
  id: string;
  card: PokemonCard | null;
  onRemoveCard: (slotId: string) => void;
}

const BinderSlot: React.FC<BinderSlotProps> = ({ id, card, onRemoveCard }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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
      className={`binder-slot ${card ? "has-card" : "empty"} ${
        isDragging ? "dragging" : ""
      }`}
    >
      {card ? (
        <div className="card-container">
          <img src={card.images.small} alt={card.name} className="card-image" />
          <button
            className="remove-button"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCard(id);
            }}
          >
            ×
          </button>
          <div className="card-overlay">
            <span className="card-name">{card.name}</span>
          </div>
        </div>
      ) : (
        <div className="empty-slot">
          <span>Drop card here</span>
        </div>
      )}
    </div>
  );
};

export default BinderSlot;
