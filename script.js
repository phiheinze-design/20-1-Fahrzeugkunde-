// =======================================================
// A. ZENTRALE DATEN & ELEMENTE
// =======================================================
// Programmierer: Philipp Heinze, Feuerwehr Stadtlauringen, phi.heinze@gmail.com


// Auslesen der Daten aus dem HTML
function loadPieceOrderFromDOM() {
    const pieces = [];
    document.querySelectorAll('.draggable').forEach(d => {
        // Daten aus data-Attributen und dem alt-Text auslesen
        const location = d.dataset.location;
        // Sicherstellen, dass der Alt-Text der Bildquelle als Name dient
        const name = d.querySelector('img').alt; 
        
        pieces.push({
            id: d.id,
            location: location,
            name: name,
       });
    });
   return pieces;
}

// HILFSFUNKTION: Fisher-Yates (Knut) Shuffle Algorithmus
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

const pieceOrder = loadPieceOrderFromDOM();
shuffleArray(pieceOrder) // HIER AKTIVIEREN/DEAKTIVIEREN SIE DAS MISCHEN

// HINWEIS: Bitte diese Größen anpassen, falls nötig
const locationSizes = {
    'links': { width: '1280px', height: '720px' }, 
    'rechts': { width: '1280px', height: '720px' }, 
	'hinten': { width: '553px', height: '793px' }, 	
    'kabine': { width: '900px', height: '792px' },
	'dach': { width: '1200px', height: '448px' },
};

let currentPieceIndex = 0;
let currentPieceData = pieceOrder[currentPieceIndex];
let currentViewLocation = null; 

// Referenzen zu den HTML-Elementen
const selectionArea = document.getElementById('selection-area');
const itemPrompt = document.getElementById('item-prompt');
const choiceButtons = document.querySelectorAll('#location-controls .choice-button'); 
const targetImage = document.getElementById('target-image');
const feedbackElement = document.getElementById('feedback');
const puzzleArea = document.getElementById('puzzle-area');
const itemImage = document.getElementById('item-image'); 
const solveButton = document.getElementById('solve-button');
const itemCloseupImage = document.getElementById('item-closeup-image'); 

// Drag-and-Drop Variablen
const draggables = document.querySelectorAll('.draggable');
const allDraggables = draggables;
let currentDraggedElement = null;
let offset = { x: 0, y: 0 };
let originalX = 0; // Wird nicht mehr in der drag-Funktion verwendet, aber für endDrag beibehalten
let originalY = 0; // Wird nicht mehr in der drag-Funktion verwendet, aber für endDrag beibehalten


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
        
        // TOUCH-EVENTS: passive: false ist entscheidend, damit e.preventDefault() das Standard-Scrollen blockiert
        draggable.addEventListener('touchstart', startDrag, { passive: false }); 
    });

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);

    // TOUCH-EVENTS FÜR DEN GESAMTEN BILDSCHIRM HINZUFÜGEN
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    // ----------------------------------------------------------------------------------

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
        const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
        const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
        
        currentDraggedElement = e.target.closest('.draggable');
        currentDraggedElement.style.setProperty('z-index', '20', 'important'); // Element in den Vordergrund bringen

        const rect = currentDraggedElement.getBoundingClientRect();
        
        // Speichert den Abstand zwischen Maus/Finger und der linken oberen Ecke des Elements
        // Dies ist der entscheidende Wert für die robuste drag-Funktion
        offset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
        
        // originalX/Y nur für die endDrag-Funktion nötig, um nicht undefined zu sein
        originalX = clientX;
        originalY = clientY;
    }
}

function drag(e) {
    if (!currentDraggedElement) return;

    // Verhindert das Scrollen auf Touch-Geräten, während gezogen wird
    e.preventDefault(); 
    
    // KORREKTES AUSLESEN DER KOORDINATEN (für Maus oder Touch)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
    const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
    
    // 🚀 NEUE ROBUSTE LOGIK:
    // 1. Neue Position relativ zum Viewport (Fenster) berechnen
    const viewportLeft = clientX - offset.x;
    const viewportTop = clientY - offset.y;
    
    // 2. Position des Elternelements (puzzleArea) holen
    const parentRect = puzzleArea.getBoundingClientRect();
    
    // 3. Neue Position relativ zum Elternelement berechnen (Absolute Viewport-Position minus Eltern-Offset)
    const newLeft = viewportLeft - parentRect.left;
    const newTop = viewportTop - parentRect.top;

    currentDraggedElement.style.left = `${newLeft}px`;
    currentDraggedElement.style.top = `${newTop}px`;
    
    // WICHTIG: originalX und originalY NICHT in drag updaten, da wir nicht mehr mit Deltas arbeiten.
}

function endDrag(e) {
    if (!currentDraggedElement) return;

    // e.changedTouches[0] wird bei 'touchend' verwendet
    // const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    // const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

    const piece = currentDraggedElement;
    currentDraggedElement.style.setProperty('z-index', '10', 'important');
    
    // K_OORDINATEN DES ZIELS HOLEN
    const targetX = parseInt(piece.dataset.targetX);
    const targetY = parseInt(piece.dataset.targetY);
    
    // K_OORDINATEN DES AKTUELLEN TEILS HOLEN
    const currentLeft = parseInt(piece.style.left);
    const currentTop = parseInt(piece.style.top);
    
    // ABSTAND BERECHNEN (Toleranz 40 Pixel)
    const tolerance = 40; 
    const isXCorrect = Math.abs(currentLeft - targetX) < tolerance;
    const isYCorrect = Math.abs(currentTop - targetY) < tolerance;

    if (isXCorrect && isYCorrect) {
        // KORREKTE POSITION
        piece.style.left = `${targetX}px`;
        piece.style.top = `${targetY}px`;
        piece.classList.add('solved');
        piece.draggable = false;
        
        feedbackElement.textContent = `✅ Korrekt platziert: ${currentPieceData.name}`;
        feedbackElement.className = 'correct';
        feedbackElement.classList.remove('hidden');

        // Gehe zur nächsten Aufgabe
        currentPieceIndex++;
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('correct');
            startNextItemSelection();
        }, 1500);

    } else {
        // FALSCHE POSITION: Element an die Startposition zurücksetzen
        
        // Startposition relativ zur Puzzle-Area berechnen
        const initialLeft = piece.dataset.initialLeft;
        const initialTop = piece.dataset.initialTop;
        
        piece.style.setProperty('left', initialLeft, 'important'); 
        piece.style.setProperty('top', initialTop, 'important'); 

        feedbackElement.textContent = `❌ Nicht korrekt. Probiere es weiter oder zeige die Lösung an.`;
        feedbackElement.className = 'incorrect';
        feedbackElement.classList.remove('hidden');

        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 1500);
    }
    
    currentDraggedElement = null;
}


// -------------------------------------------------------------
// E. GROBE POSITION WECHSELN/KORRIGIEREN (Zentralisierte Logik)
// -------------------------------------------------------------


function setLocationView(location) {
    currentViewLocation = location;
    
    let newInitialLeft = null;

    // Größe des Containers anpassen
    const size = locationSizes[location];
    if (size) {
        puzzleArea.style.width = size.width; 
        puzzleArea.style.height = size.height;
        
        // NEU: Dynamische Left-Berechnung
        // 1. Breite des Containers ermitteln (z.B. 500)
        const areaWidthPx = parseInt(size.width); 
        // 2. Neue Startposition berechnen (Breite + 50px Abstand)
        newInitialLeft = `${areaWidthPx + 50}px`; 
    }

    // 1. Lade das korrekte Hintergrundbild
    let bgFile = '';
    switch (location) {
        case 'links':
            bgFile = 'Hintergrundbild_FahrzeugLinks.jpg';
            break;
        case 'rechts':
            bgFile = 'Hintergrundbild_FahrzeugRechts.jpg';
            break;
		case 'hinten':
            bgFile = 'Hintergrundbild_GR.jpg';
            break;
        case 'kabine':
            bgFile = 'Hintergrundbild_FahrzeugKabine.jpg';
            break;
		case 'dach':
            bgFile = 'Hintergrundbild_FahrzeugDach.jpg';
            break;
        default:
            return;
    }
    targetImage.src = `Assets/${bgFile}`;
    
    // 2. Verwalte die Sichtbarkeit und Ziehbarkeit der Teile
    allDraggables.forEach(d => {
        const isCurrentPiece = d.id === currentPieceData.id;
        const isSolved = d.classList.contains('solved');

        if (isSolved) {
            d.draggable = false; 
            
            if (d.dataset.location === location) {
                d.classList.remove('hidden-piece'); 
            } else {
                d.classList.add('hidden-piece');
            }
        } else if (isCurrentPiece) {
            // Das AKTUELLE, UNGELÖSTE Teil:
            d.classList.remove('hidden-piece');
            d.draggable = true;
            
            // Setze Position zurück (Dynamisch für Left, statisch für Top)
            if (newInitialLeft) {
                // HIER: Dynamische Left-Position anwenden
                d.style.setProperty('left', newInitialLeft, 'important');
            } else {
                // Fallback auf den ursprünglichen HTML-Wert
                d.style.setProperty('left', d.dataset.initialLeft, 'important');
            }
            d.style.setProperty('top', d.dataset.initialTop, 'important');
            d.style.setProperty('z-index', '10', 'important');
        } else {
            // Verstecke alle anderen (ungelösten, nicht aktuellen) Teile
            d.classList.add('hidden-piece');
        }
    });

    // 3. Wechsel zur Puzzle-Ansicht
    selectionArea.classList.add('hidden');
    puzzleArea.classList.remove('hidden');
}


// -------------------------------------------------------------
// F. LÖSUNGSLOGIK
// -------------------------------------------------------------
function showSolution() {
    const piece = document.getElementById(currentPieceData.id);
    if (!piece) return;

    // 1. Wechsel zur korrekten Ansicht, falls nicht schon geschehen
    setLocationView(currentPieceData.location); 

    // 2. Element an die korrekte Zielposition setzen
    const targetX = parseInt(piece.dataset.targetX);
    const targetY = parseInt(piece.dataset.targetY);
    piece.style.left = `${targetX}px`;
    piece.style.top = `${targetY}px`;
    piece.draggable = false;
    piece.classList.add('solved');
    piece.classList.remove('hidden-piece');
    piece.classList.add('highlight-solution');

    // 3. Feedback anzeigen
    feedbackElement.textContent = '✅ Lösung angezeigt.';
    feedbackElement.className = 'correct';
    feedbackElement.classList.remove('hidden');

    // 4. Gehe zur nächsten Aufgabe
    currentPieceIndex++;
    setTimeout(() => {
        piece.classList.remove('highlight-solution')
        feedbackElement.classList.add('hidden');
        feedbackElement.classList.remove('correct');
        startNextItemSelection();
    }, 1500);
}

// -------------------------------------------------------------
// G. EVENT LISTENERS
// -------------------------------------------------------------
// Klicks auf die Standort-Buttons
choiceButtons.forEach(button => {
    button.addEventListener('click', () => {
        setLocationView(button.dataset.position);
    });
});

// NEU: Klick auf den Lösungs-Button
if (solveButton) {
    solveButton.addEventListener('click', showSolution);
}

// -------------------------------------------------------------
// H. START
// -------------------------------------------------------------
initializeDraggables();