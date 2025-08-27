import React, { useState, useEffect } from "react";
import { Download, Save, Plus } from "lucide-react";
import type { BinderLayout, BinderTemplate } from "./types/Binder";
import type { PokemonCard } from "./types/Card";
import { DataService } from "./services/DataService";
import BinderGrid from "./components/BinderGrid";
import CardSearch from "./components/CardSearch";
import "./styles/App.css";

function App() {
  const [currentBinder, setCurrentBinder] = useState<BinderLayout | null>(null);
  const [templates, setTemplates] = useState<BinderTemplate[]>([]);
  const [availableBinders, setAvailableBinders] = useState<string[]>([]);
  const [cards, setCards] = useState<Map<string, PokemonCard>>(new Map());
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const [binderIds, templateList] = await Promise.all([
      DataService.loadAvailableBinders(),
      DataService.loadTemplates(),
    ]);

    setAvailableBinders(binderIds);
    setTemplates(templateList);

    // Load first available binder or create new one
    if (binderIds.length > 0) {
      await loadBinder(binderIds[0]);
    } else if (templateList.length > 0) {
      createNewBinder(templateList[0].id);
    }
  };

  const loadBinder = async (binderId: string) => {
    const binder = await DataService.loadBinder(binderId);
    if (binder) {
      setCurrentBinder(binder);

      // Load all cards used in this binder
      const cardIds = binder.cardPositions
        .filter((pos) => pos.cardId)
        .map((pos) => pos.cardId!);

      const newCards = new Map(cards);
      for (const cardId of cardIds) {
        if (!newCards.has(cardId)) {
          // For now, we'll need to search for the card to get its data
          // In a real app, you'd want to store card data with the binder
          newCards.set(cardId, {
            id: cardId,
            name: "Loading...",
            set: { id: "", name: "", series: "" },
            number: "",
            rarity: "",
            images: { small: "", large: "" },
          });
        }
      }
      setCards(newCards);
    }
  };

  const createNewBinder = (templateId: string) => {
    try {
      const newBinder = DataService.createBinderFromTemplate(
        templateId,
        templates
      );
      setCurrentBinder(newBinder);
    } catch (error) {
      console.error("Failed to create binder:", error);
    }
  };

  const handleCardSelect = (card: PokemonCard) => {
    if (!currentBinder) return;

    // Add card to our cards map
    const newCards = new Map(cards);
    newCards.set(card.id, card);
    setCards(newCards);

    // Find first empty slot or use selected slot
    const newCardPositions = [...currentBinder.cardPositions];
    let targetIndex = selectedSlot;

    if (targetIndex === null) {
      targetIndex = newCardPositions.findIndex((pos) => pos.isEmpty);
    }

    if (targetIndex !== -1) {
      newCardPositions[targetIndex] = {
        ...newCardPositions[targetIndex],
        cardId: card.id,
        isEmpty: false,
      };

      setCurrentBinder({
        ...currentBinder,
        cardPositions: newCardPositions,
        updatedAt: new Date().toISOString(),
      });
    }

    setSelectedSlot(null);
  };

  const saveBinder = () => {
    if (currentBinder) {
      DataService.saveBinder(currentBinder);
      // Update available binders list
      if (!availableBinders.includes(currentBinder.id)) {
        setAvailableBinders([...availableBinders, currentBinder.id]);
      }
    }
  };

  const exportBinder = () => {
    if (currentBinder) {
      DataService.exportBinderForGitHub(currentBinder);
    }
  };

  const updateBinderName = (newName: string) => {
    if (currentBinder) {
      setCurrentBinder({
        ...currentBinder,
        name: newName,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1>🎴 Pokemon Card Binder</h1>
          {currentBinder && (
            <input
              type="text"
              value={currentBinder.name}
              onChange={(e) => updateBinderName(e.target.value)}
              className="binder-name-input"
              placeholder="Binder name..."
            />
          )}
        </div>

        <div className="controls">
          <select
            onChange={(e) => e.target.value && createNewBinder(e.target.value)}
            value=""
          >
            <option value="">Create New Binder...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>

          {availableBinders.length > 0 && (
            <select
              onChange={(e) => e.target.value && loadBinder(e.target.value)}
              value={currentBinder?.id || ""}
            >
              <option value="">Load Binder...</option>
              {availableBinders.map((binderId) => (
                <option key={binderId} value={binderId}>
                  {binderId.replace("binder-", "Binder ")}
                </option>
              ))}
            </select>
          )}

          <button onClick={saveBinder} disabled={!currentBinder}>
            <Save size={16} />
            Save
          </button>

          <button onClick={exportBinder} disabled={!currentBinder}>
            <Download size={16} />
            Export
          </button>
        </div>
      </header>

      <div className="app-content">
        <aside className="sidebar">
          <h3>Search Cards</h3>
          <CardSearch onCardSelect={handleCardSelect} />

          {currentBinder && (
            <div className="binder-stats">
              <h4>Binder Stats</h4>
              <p>
                Cards:{" "}
                {
                  currentBinder.cardPositions.filter((pos) => !pos.isEmpty)
                    .length
                }{" "}
                / {currentBinder.cardPositions.length}
              </p>
              <p>Template: {currentBinder.template}</p>
              <p>
                Last Updated:{" "}
                {new Date(currentBinder.updatedAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </aside>

        <main className="main-content">
          {currentBinder ? (
            <BinderGrid
              binder={currentBinder}
              onBinderUpdate={setCurrentBinder}
              cards={cards}
            />
          ) : (
            <div className="empty-state">
              <h2>Welcome to Pokemon Card Binder!</h2>
              <p>Create your first binder to get started.</p>
              <button
                onClick={() =>
                  templates.length > 0 && createNewBinder(templates[0].id)
                }
                disabled={templates.length === 0}
                className="create-first-binder"
              >
                <Plus size={20} />
                Create Your First Binder
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
