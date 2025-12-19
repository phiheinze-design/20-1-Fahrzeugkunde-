// =======================================================
// A. ZENTRALE DATEN & ELEMENTE
// =======================================================
// Programmierer: Philipp Heinze, Feuerwehr Stadtlauringen, phi.heinze@gmail.com


// HILFSFUNKTION: Fisher-Yates (Knut) Shuffle Algorithmus
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Auslesen der Daten aus dem HTML (Wird erst nach DOMContentLoaded aufgerufen!)
function loadPieceOrderFromDOM() {
    const pieces = [];
    
    // WICHTIG: Verwenden von div[id^="piece-"] als robuster Selektor
    document.querySelectorAll('div[id^="piece-"]').forEach(d => {
        // Sicherstellen, dass der Alt-Text der Bildquelle als Name dient
        const name = d.querySelector('img').alt; 
        
        pieces.push({
            id: d.id,
            location: d.dataset.location,
            name: name,
       });
    });
   return pieces;
}

// HINWEIS: Bitte diese Größen anpassen, falls nötig
const locationSizes = {
    'links': { width: '1280px', height: '720px' }, 
    'rechts': { width: '1280px', height: '720px' }, 
	'hinten': { width: '553px', height: '793px' }, 	
    'kabine': { width: '900px', height: '792px' },
	'dach': { width: '1200px', height: '448px' },
};

// Globale Variablen für den Programmablauf (werden in DOMContentLoaded initialisiert)
let pieceOrder = [];
let currentPieceIndex = 0;
let currentPieceData = null;
let currentViewLocation = null; 

// Referenzen zu den HTML-Elementen (werden in DOMContentLoaded gesetzt)
let selectionArea;
let itemPrompt;
let choiceButtons; 
let targetImage;
let feedbackElement;
let puzzleArea;
let itemImage; 
let solveButton;
let itemCloseupImage; 

// Drag-and-Drop Variablen
let allDraggables;
let currentDraggedElement = null;
let offset = { x: 0, y: 0 };
let originalX = 0; 
let originalY = 0; 


// -------------------------------------------------------------
// B. HILFSFUNKTIONEN ZUM SPEICHERN DER STARTSTYLES & INITIALISIERUNG
// -------------------------------------------------------------
function initializeDraggables() {
    allDraggables.forEach(d => {
        // Wir speichern nur TOP und Breite/Höhe, da LEFT dynamisch berechnet wird
        d.dataset.initialLeft = d.style.left; 
        d.dataset.initialTop = d.style.top;
        d.dataset.initialWidth = d.style.width;
        d.dataset.initialHeight = d.style.height;
        
        d.draggable = true; 
    });
    
    // ----------------------------------------------------------------------------------
    // HINZUFÜGEN DER DRAG-EVENT-LISTENER (für PC und Mobil)
    // ----------------------------------------------------------------------------------
    allDraggables.forEach(draggable => {
        // MAUS-EVENTS (für PC)
        draggable.addEventListener('mousedown', startDrag);
        
        // TOUCH-EVENTS: passive: false ist entscheidend für mobiles Dragging
        draggable.addEventListener('touchstart', startDrag, { passive: false }); 
    });

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // TOUCH-EVENTS FÜR DEN GESAMTEN BILDSCHIRM HINZUFÜGEN
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    // ----------------------------------------------------------------------------------
    
    // G. EVENT LISTENERS
    // Klicks auf die Standort-Buttons (Muss HIER initialisiert werden, da choiceButtons jetzt definiert ist)
    choiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLocationView(button.dataset.position);
        });
    });

    // NEU: Klick auf den Lösungs-Button
    if (solveButton) {
        solveButton.addEventListener('click', showSolution);
    }


    startNextItemSelection();
}


// -------------------------------------------------------------
// C. STATUS-STEUERUNG (Selection Step)
// -------------------------------------------------------------

function startNextItemSelection() {
    if (currentPieceIndex >= pieceOrder.length) {
	showFinishedMessage(); 
        return;
    }

    currentPieceData = pieceOrder[currentPieceIndex];
    if (solveButton) solveButton.classList.remove('hidden');

    puzzleArea.classList.add('hidden');
    selectionArea.classList.remove('hidden');
    currentViewLocation = null;

    itemPrompt.innerHTML = `Wo gehört **${currentPieceData.name}** hin?`;
    
    allDraggables.forEach(d => d.classList.add('hidden-piece'));

    const currentDraggableElement = document.getElementById(currentPieceData.id);
    if (currentDraggableElement) {
        const imageSource = currentDraggableElement.querySelector('img').src;
        itemImage.src = imageSource;
        itemImage.alt = currentPieceData.name;
        
        itemImage.style.width = currentDraggableElement.dataset.initialWidth || currentDraggableElement.style.width;
        itemImage.style.height = currentDraggableElement.dataset.initialHeight || currentDraggableElement.style.height;
       
        // Lese das Attribut: Nutze dataset.closeupsrc (CamelCase)
        const closeupSource = currentDraggableElement.dataset.closeupsrc; 
		
        if (itemCloseupImage) {
            if (closeupSource) {
                 itemCloseupImage.src = closeupSource;
                 itemCloseupImage.alt = `Nahaufnahme von ${currentPieceData.name}`;
                 itemCloseupImage.classList.remove('hidden'); // Macht das Bild sichtbar
            } else {
                 itemCloseupImage.src = '';
                 itemCloseupImage.classList.add('hidden'); // Versteckt das Bild, falls kein Pfad vorhanden
            }
        }
    }
}

function showFinishedMessage() {
    
    // 1. Meldung und Button dynamisch in die selectionArea einfügen.
    selectionArea.innerHTML = '<h2>🏆 Glückwunsch! Du hast alle Teile gelöst.</h2>' +
                              '<p>Klicke auf **OK**, um die vollständige Lösung anzusehen.</p>' +
                              '<button id="finish-button" class="choice-button">OK</button>';
	puzzleArea.classList.add('hidden');
	selectionArea.classList.remove('hidden');
    if (solveButton) solveButton.classList.add('hidden');
    
    // 3. Den Button holen und den Event Listener hinzufügen
    const finishButton = document.getElementById('finish-button');
    
    if (finishButton) {
        finishButton.addEventListener('click', () => {
            puzzleArea.classList.remove('hidden');
			selectionArea.classList.add('hidden');
        });
    }
}

// -------------------------------------------------------------
// D. DRAG-AND-DROP FUNKTIONEN
// -------------------------------------------------------------

function startDrag(e) {
    // Verhindert Standard-Browserverhalten (z.B. Kontextmenü/Scrollen)
    e.preventDefault(); 
    
    if (e.target.closest('.draggable') && e.target.closest('.draggable').draggable) {
        
        // KORREKTES AUSLESEN DER KOORDINATEN (für Maus oder Touch)
        const clientX = e.touches ?