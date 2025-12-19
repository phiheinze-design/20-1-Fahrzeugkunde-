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

// Auslesen der Daten aus dem HTML
function loadPieceOrderFromDOM() {
    const pieces = [];
    document.querySelectorAll('.draggable').forEach(d => {
        const location = d.dataset.location;
        const name = d.querySelector('img').alt; 
        
        pieces.push({
            id: d.id,
            location: location,
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

// Referenzen zu den HTML-Elementen (werden in DOMContentLoaded initialisiert)
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
let originalX = 0; // Speichert Original-Maus/Touch-Koordinate beim Start


// -------------------------------------------------------------
// B. HILFSFUNKTIONEN ZUM SPEICHERN DER STARTSTYLES & INITIALISIERUNG
// -------------------------------------------------------------
function initializeDraggables() {
    if (!allDraggables || allDraggables.length === 0) return;

    allDraggables.forEach(d => {
        d.dataset.initialLeft = d.style.left;
        d.dataset.initialTop = d.style.top;
        d.dataset.initialWidth = d.style.width;
        d.dataset.initialHeight = d.style.height;
        d.draggable = true;
    });

    // Event-Listener für Buttons
    choiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLocationView(button.dataset.position);
        });
    });

    if (solveButton) {
        solveButton.addEventListener('click', showSolution);
    }
    
    // ----------------------------------------------------------------------------------
    // NEU: TOUCH & MAUS DRAG-LOGIK (Ersetzt die standardmäßige Drag-API)
    // ----------------------------------------------------------------------------------
    allDraggables.forEach(draggable => {
        // PC-Events
        draggable.addEventListener('mousedown', startDrag);
        // Mobile Events (Passiv: false ist wichtig, um das Scrollen zu verhindern)
        draggable.addEventListener('touchstart', startDrag, { passive: false }); 
    });

    // Events für das Bewegen und Loslassen (auf dem gesamten Dokument)
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', drag, { passive: false });
    document.addEventListener('touchend', endDrag);
    // ----------------------------------------------------------------------------------


    startNextItemSelection();
}

// -------------------------------------------------------------
// C. DRAG-AND-DROP FUNKTIONEN (Maus/Touch)
// -------------------------------------------------------------

function startDrag(e) {
    // Verhindert Standard-Browserverhalten (z.B. Kontextmenü/Scrollen)
    e.preventDefault(); 
    
    // Sicherstellen, dass wir ein ziehbares Element erwischt haben
    if (e.target.closest('.draggable') && e.target.closest('.draggable').draggable) {
        
        // Korrektes Auslesen der Koordinaten (Maus oder Touch)
        const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
        const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
        
        currentDraggedElement = e.target.closest('.draggable');
        currentDraggedElement.style.setProperty('z-index', '20', 'important'); // In den Vordergrund

        const rect = currentDraggedElement.getBoundingClientRect();
        
        // Speichert den Abstand zwischen Maus/Finger und der linken oberen Ecke des Elements
        offset = {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }
}

function drag(e) {
    if (!currentDraggedElement) return;

    // Verhindert das Scrollen auf Touch-Geräten, während gezogen wird
    e.preventDefault(); 
    
    // Korrektes Auslesen der Koordinaten (Maus oder Touch)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX; 
    const clientY = e.touches ? e.touches[0].clientY : e.clientY; 
    
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
}


function endDrag(e) {
    if (!currentDraggedElement) return;

    const piece = currentDraggedElement;
    piece.style.setProperty('z-index', '10', 'important');
    
    // Aktuelle Position in der Puzzle-Area (die wir beim Drag gesetzt haben)
    const currentLeft = parseInt(piece.style.left);
    const currentTop = parseInt(piece.style.top);
    
    // Prüfung der Position
    checkPosition(piece, currentLeft, currentTop);
    
    currentDraggedElement = null;
}


function checkPosition(element, currentX, currentY) {

    // 1. Falscher Bereich?
    if (currentViewLocation !== currentPieceData.location) {
        feedbackElement.textContent = `❌ Falsch. Das Teil gehört nicht in den Bereich **${currentViewLocation.toUpperCase()}**.`;
        feedbackElement.className = 'incorrect';
        feedbackElement.classList.remove('hidden');
        
        // Zurücksetzen zur Startposition
        element.style.setProperty('left', element.dataset.initialLeft, 'important');
        element.style.setProperty('top', element.dataset.initialTop, 'important');
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 3000); 
        return; 
    }
    
    // 2. Richtiger Bereich, aber falsche Koordinaten?
    const targetX = parseInt(element.dataset.targetX); 
    const targetY = parseInt(element.dataset.targetY);
    const tolerance = 80; // Toleranz vergrößert für Touch-Bedienung

    const isCorrectX = Math.abs(currentX - targetX) < tolerance;
    const isCorrectY = Math.abs(currentY - targetY) < tolerance;

    if (isCorrectX && isCorrectY) {
        // Korrekt platziert
        feedbackElement.textContent = '🎉 Richtig! Gut gemacht.';
        feedbackElement.className = 'correct';
        feedbackElement.classList.remove('hidden');
        
        element.style.left = `${targetX}px`; // Korrigiere auf exakte Zielposition
        element.style.top = `${targetY}px`;
        element.draggable = false; 
        element.classList.add('solved');
        currentPieceIndex++;
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('correct');
            startNextItemSelection(); 
        }, 1500); 

    } else {
        // Falsche Position
        feedbackElement.textContent = '❌ Falsche Position. Versuch es nochmal genauer.';
        feedbackElement.className = 'incorrect';
        
        // Zurücksetzen zur Startposition
        element.style.setProperty('left', element.dataset.initialLeft, 'important');
        element.style.setProperty('top', element.dataset.initialTop, 'important');
        feedbackElement.classList.remove('hidden');
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 1500);
    }
}

// -------------------------------------------------------------
// D. STATUS-STEUERUNG (Selection Step)
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
       
        const closeupSource = currentDraggableElement.dataset.closeupsrc;
		
        if (itemCloseupImage) {
            if (closeupSource) {
                 itemCloseupImage.src = closeupSource;
                 itemCloseupImage.alt = `Nahaufnahme von ${currentPieceData.name}`;
                 itemCloseupImage.classList.remove('hidden'); 
            } else {
                 itemCloseupImage.src = '';
                 itemCloseupImage.classList.add('hidden');
            }
        }
    }
}

function showFinishedMessage() {
    
    selectionArea.innerHTML = '<h2>🏆 Glückwunsch! Du hast alle Teile gelöst.</h2>' +
                              '<p>Klicke auf **OK**, um die vollständige Lösung anzusehen.</p>' +
                              '<button id="finish-button" class="choice-button">OK</button>';
	puzzleArea.classList.add('hidden');
	selectionArea.classList.remove('hidden');
    if (solveButton) solveButton.classList.add('hidden');
    
    const finishButton = document.getElementById('finish-button');
    
    if (finishButton) {
        finishButton.addEventListener('click', () => {
            showAllSolvedPieces();
        });
    }
}

function showAllSolvedPieces() {
    selectionArea.classList.add('hidden');
    puzzleArea.classList.remove('hidden');
    
    const firstLocation = pieceOrder.length > 0 ? pieceOrder[0].location : 'links';
    setLocationView(firstLocation, true);
}


// -------------------------------------------------------------
// E. GROBE POSITION WECHSELN/KORRIGIEREN (Zentralisierte Logik)
// -------------------------------------------------------------

function setLocationView(location, showAll = false) {
    currentViewLocation = location;
    
    let newInitialLeft = null;

    const size = locationSizes[location];
    if (size) {
        puzzleArea.style.width = size.width; 
        puzzleArea.style.height = size.height;
        newInitialLeft = `${parseInt(size.width) + 50}px`; 
    }

    const bgFile = getLocationBackground(location);
    targetImage.src = `Assets/${bgFile}`;
    
    allDraggables.forEach(d => {
        const isCurrentPiece = d.id === currentPieceData?.id;
        const isSolved = d.classList.contains('solved');
        const belongsToLocation = d.dataset.location === location;

        if (belongsToLocation) {
            d.classList.remove('hidden-piece');
            
            if (showAll || isSolved) {
                d.draggable = false;
                d.style.left = `${d.dataset.targetX}px`;
                d.style.top = `${d.dataset.targetY}px`;
                d.style.width = d.dataset.initialWidth;
                d.style.height = d.dataset.initialHeight;
            } else if (isCurrentPiece) {
                d.draggable = true; 
                d.style.setProperty('left', newInitialLeft || d.dataset.initialLeft, 'important');
                d.style.setProperty('top', d.dataset.initialTop, 'important'); 
                d.style.setProperty('z-index', '10', 'important'); 
            } else {
                d.classList.add('hidden-piece');
            }
        } else {
            d.classList.add('hidden-piece'); 
        }
    });
    
    if (!showAll) {
        selectionArea.classList.add('hidden');
        puzzleArea.classList.remove('hidden');
    }
}

function getLocationBackground(location) {
    switch (location) {
        case 'links': return 'Hintergrundbild_FahrzeugLinks.jpg';
        case 'rechts': return 'Hintergrundbild_FahrzeugRechts.jpg';
		case 'hinten': return 'Hintergrundbild_GR.jpg';
        case 'kabine': return 'Hintergrundbild_FahrzeugKabine.jpg';
		case 'dach': return 'Hintergrundbild_FahrzeugDach.jpg';
        default: return '';
    }
}


// -------------------------------------------------------------
// F. LÖSUNGSLOGIK
// -------------------------------------------------------------

function showSolution() {
    const piece = document.getElementById(currentPieceData.id);
    if (!piece) return;
    setLocationView(currentPieceData.location);
    const targetX = parseInt(piece.dataset.targetX); 
    const targetY = parseInt(piece.dataset.targetY);