import React, { useState, useMemo, useCallback } from "react";
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
import type { BinderLayout, CardPosition } from "../types/Binder";
import type { PokemonCard } from "../types/Card";
import BinderSlot from "./BinderSlot";
import "../styles/BinderGrid.css";

// Create empty slots for a page
const createEmptyPage = (rows: number, cols: number): CardPosition[] => {
  return Array.from({ length: rows * cols }, (_, i) => ({
    cardId: null,
    row: Math.floor(i / cols),
    col: i % cols,
    isEmpty: true,
  }));
};

interface BinderGridProps {
  binder: BinderLayout;
  onBinderUpdate: (updatedBinder: BinderLayout) => void;
  cards: Map<string, PokemonCard>;
}

const BinderGrid: React.FC<BinderGridProps> = ({
  binder,
  onBinderUpdate,
  cards,
}) => {
  const [activeCard, setActiveCard] = useState<PokemonCard | null>(null);
  const [page, setPage] = useState(1);
  const [notification, setNotification] = useState<string>("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(binder.name);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearDialogType, setClearDialogType] = useState<"page" | "binder">(
    "page"
  );
  const pageSize = binder.dimensions.rows * binder.dimensions.cols;
  const totalPages = Math.ceil(binder.cardPositions.length / pageSize);
  const maxPage = binder.maxPage || 1;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const slotIds = useMemo(
    () =>
      binder.cardPositions
        .slice((page - 1) * pageSize, page * pageSize)
        .map((_, idx) => `slot-${(page - 1) * pageSize + idx}`),
    [binder.cardPositions, page, pageSize]
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

    if (activeIndex >= binder.cardPositions.length || overIndex >= binder.cardPositions.length) {
      return;
    }

    const activePos = binder.cardPositions[activeIndex];
    const overPos = binder.cardPositions[overIndex];

    const newCardPositions = [...binder.cardPositions];
    newCardPositions[activeIndex] = { ...overPos };
    newCardPositions[overIndex] = { ...activePos };

    onBinderUpdate({
      ...binder,
      cardPositions: newCardPositions,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddCard = useCallback(
    (card: PokemonCard) => {
      setNotification("");
      let newCardPositions = [...binder.cardPositions];
      let newPage = page;
      const startIdx = (page - 1) * pageSize;
      let addedToCurrentPage = false;

      for (let i = startIdx; i < startIdx + pageSize && i < newCardPositions.length; i++) {
        if (newCardPositions[i].isEmpty) {
          newCardPositions[i] = {
            ...newCardPositions[i],
            cardId: card.id,
            isEmpty: false,
          };
          addedToCurrentPage = true;
          break;
        }
      }

      if (!addedToCurrentPage) {
        let foundEmptySlot = false;
        for (let i = 0; i < newCardPositions.length; i++) {
          if (newCardPositions[i].isEmpty) {
            newCardPositions[i] = {
              ...newCardPositions[i],
              cardId: card.id,
              isEmpty: false,
            };
            newPage = Math.floor(i / pageSize) + 1;
            foundEmptySlot = true;
            break;
          }
        }

        if (!foundEmptySlot) {
          if (totalPages >= maxPage) {
            setNotification(`Cannot add card: binder is full (max ${maxPage} pages).`);
            return;
          }

          const { rows, cols } = binder.dimensions;
          const newSlots = createEmptyPage(rows, cols);
          newSlots[0] = {
            ...newSlots[0],
            cardId: card.id,
            isEmpty: false,
          };
          newCardPositions = [...newCardPositions, ...newSlots];
          newPage = totalPages + 1;
        }
      }

      onBinderUpdate({
        ...binder,
        cardPositions: newCardPositions,
        updatedAt: new Date().toISOString(),
      });

      setPage(newPage);
      setNotification("");
    },
    [binder, page, totalPages, onBinderUpdate, maxPage]
  );

  const handleTitleSave = useCallback(() => {
    onBinderUpdate({
      ...binder,
      name: tempTitle,
      updatedAt: new Date().toISOString(),
    });
    setIsEditingTitle(false);
  }, [binder, tempTitle, onBinderUpdate]);

  const handleTitleCancel = useCallback(() => {
    setTempTitle(binder.name);
    setIsEditingTitle(false);
  }, [binder.name]);

  const handleClearPage = useCallback(() => {
    const pageSize = binder.dimensions.rows * binder.dimensions.cols;
    const startIdx = (page - 1) * pageSize;
    const endIdx = page * pageSize;

    const newCardPositions = [...binder.cardPositions];
    for (let i = startIdx; i < endIdx && i < newCardPositions.length; i++) {
      newCardPositions[i] = {
        ...newCardPositions[i],
        cardId: null,
        isEmpty: true,
      };
    }

    onBinderUpdate({
      ...binder,
      cardPositions: newCardPositions,
      updatedAt: new Date().toISOString(),
    });

    setShowClearDialog(false);
    setNotification(`Page ${page} cleared successfully!`);
    setTimeout(() => setNotification(""), 3000);
  }, [binder, page, onBinderUpdate]);

  const handleClearBinder = useCallback(() => {
    const newCardPositions = binder.cardPositions.map((pos) => ({
      ...pos,
      cardId: null,
      isEmpty: true,
    }));

    onBinderUpdate({
      ...binder,
      cardPositions: newCardPositions,
      updatedAt: new Date().toISOString(),
    });

    setPage(1);
    setShowClearDialog(false);
    setNotification("Entire binder cleared successfully!");
    setTimeout(() => setNotification(""), 3000);
  }, [binder, onBinderUpdate]);

  const openClearDialog = useCallback((type: "page" | "binder") => {
    setClearDialogType(type);
    setShowClearDialog(true);
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).handleAddCardToBinder = handleAddCard;
    }
  }, [handleAddCard]);

  return (
    <div className="binder-container">
      {notification && (
        <div style={{ color: "#ff1744", marginBottom: "1rem", fontWeight: 600 }}>
          {notification}
        </div>
      )}
      <div className="binder-header">
        {isEditingTitle ? (
          <input
            className="binder-title-input"
            value={tempTitle}
            onChange={(e) => setTempTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleTitleSave();
              } else if (e.key === "Escape") {
                handleTitleCancel();
              }
            }}
            autoFocus
          />
        ) : (
          <h2 onClick={() => setIsEditingTitle(true)}>{binder.name}</h2>
        )}
        <span className="binder-info">
          {binder.dimensions.rows}×{binder.dimensions.cols} • {binder.template}
        </span>
      </div>

      <div className="page-navigation">
        <div className="nav-controls">
          <button
            onClick={() => {
              setNotification("");
              setPage(page > 1 ? page - 1 : 1);
            }}
            disabled={page === 1}
            className="nav-btn"
          >
            ← Prev
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => {
              setNotification("");
              if (page === totalPages) {
                if (totalPages >= maxPage) {
                  setNotification(`Cannot add new page: binder is full (max ${maxPage} pages).`);
                  return;
                }
                const newSlots = createEmptyPage(binder.dimensions.rows, binder.dimensions.cols);
                const newCardPositions = [...binder.cardPositions, ...newSlots];
                onBinderUpdate({
                  ...binder,
                  cardPositions: newCardPositions,
                  updatedAt: new Date().toISOString(),
                });
                setPage(page + 1);
              } else {
                setPage(page < totalPages ? page + 1 : totalPages);
              }
            }}
            className="nav-btn"
          >
            Next →
          </button>
        </div>
        
        <div className="clear-controls">
          <button
            onClick={() => openClearDialog('page')}
            className="clear-btn"
            title="Clear current page"
          >
            Clear Page
          </button>
          <button
            onClick={() => openClearDialog('binder')}
            className="clear-btn danger"
            title="Clear entire binder"
          >
            Clear All
          </button>
        </div>
      </div>

      {showClearDialog && (
        <div className="clear-dialog-overlay">
          <div className="clear-dialog">
            <h3>Are you sure?</h3>
            <p>
              {clearDialogType === 'page' 
                ? `This will clear all cards from page ${page}.`
                : 'This will clear ALL cards from the entire binder.'
              }
            </p>
            <div className="dialog-buttons">
              <button
                onClick={() => setShowClearDialog(false)}
                className="dialog-btn cancel"
              >
                Cancel
              </button>
              <button
                onClick={clearDialogType === 'page' ? handleClearPage : handleClearBinder}
                className="dialog-btn confirm"
              >
                {clearDialogType === 'page' ? 'Clear Page' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            {binder.cardPositions
              .slice((page - 1) * pageSize, page * pageSize)
              .map((position, idx) => {
                const slotIndex = (page - 1) * pageSize + idx;
                const card = position.cardId ? cards.get(position.cardId) : null;
                
                return (
                  <BinderSlot
                    key={`slot-${slotIndex}`}
                    id={`slot-${slotIndex}`}
                    card={card || null}
                    onRemoveCard={() => {
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
                    }}
                  />
                );
              })}
          </div>
        </SortableContext>
        <DragOverlay adjustScale={false}>
          {activeCard && (
            <div className="drag-overlay">
              <img
                src={activeCard.images.small}
                alt={activeCard.name}
                style={{ width: "120px", height: "auto" }}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default BinderGrid;
