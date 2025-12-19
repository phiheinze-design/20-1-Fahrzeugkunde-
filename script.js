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
    // Der Selektor ist gut, aber der Aufruf muss verzögert werden!
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

// Deklariere globale Variablen, initialisiere sie aber in DOMContentLoaded
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


// -------------------------------------------------------------
// B. HILFSFUNKTIONEN ZUM SPEICHERN DER STARTSTYLES & INITIALISIERUNG
// -------------------------------------------------------------
function initializeDraggables() {
    // Sicherstellen, dass die DOM-Elemente existieren, bevor darauf zugegriffen wird
    if (!allDraggables || allDraggables.length === 0) return;

    allDraggables.forEach(d => {
        d.dataset.initialLeft = d.style.left;
        d.dataset.initialTop = d.style.top;
        d.dataset.initialWidth = d.style.width;
        d.dataset.initialHeight = d.style.height;
        d.draggable = true;
    });

    // EVENT LISTENERS FÜR BUTTONS UND DRAG/DROP HINZUFÜGEN
    choiceButtons.forEach(button => {
        button.addEventListener('click', () => {
            setLocationView(button.dataset.position);
        });
    });

    if (solveButton) {
        solveButton.addEventListener('click', showSolution);
    }
    
    // DRAG & DROP LOGIK HINZUFÜGEN (Muss neu gesetzt werden, da es in der alten Datei fehlte)
    allDraggables.forEach(draggable => {
        draggable.addEventListener('dragstart', (e) => {
            if (draggable.draggable === false) { 
                 e.preventDefault(); 
                 return;
            }
            currentDraggedElement = draggable;
            const rect = draggable.getBoundingClientRect();
            offset.x = e.clientX - rect.left;
            offset.y = e.clientY - rect.top;
            e.dataTransfer.setDragImage(draggable, offset.x, offset.y); 
            e.dataTransfer.setData('text/plain', draggable.id);
            draggable.classList.add('is-dragging'); 
        });
    });

    puzzleArea.addEventListener('dragover', (e) => { e.preventDefault(); });
    puzzleArea.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!currentDraggedElement) return;

        const areaRect = puzzleArea.getBoundingClientRect();
        let dropX = e.clientX - areaRect.left - offset.x;
        let dropY = e.clientY - areaRect.top - offset.y;

        currentDraggedElement.style.left = `${dropX}px`;
        currentDraggedElement.style.top = `${dropY}px`;
        currentDraggedElement.classList.remove('is-dragging');
        
        checkPosition(currentDraggedElement, dropX, dropY);
        currentDraggedElement = null;
    });

    startNextItemSelection();
}


// -------------------------------------------------------------
// C. STATUS-STEUERUNG (Selection Step)
// -------------------------------------------------------------
// Die nachfolgenden Funktionen (startNextItemSelection, showFinishedMessage) 
// können unverändert bleiben, da sie nun korrekt initialisiert werden.
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
            puzzleArea.classList.remove('hidden');
			selectionArea.classList.add('hidden');
        });
    }
}

// -------------------------------------------------------------
// D. GROBE POSITION WECHSELN/KORRIGIEREN (Zentralisierte Logik)
// -------------------------------------------------------------

function setLocationView(location) {
    currentViewLocation = location;
    
    let newInitialLeft = null;

    const size = locationSizes[location];
    if (size) {
        puzzleArea.style.width = size.width; 
        puzzleArea.style.height = size.height;
        newInitialLeft = `${parseInt(size.width) + 50}px`; 
    }

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
            d.classList.remove('hidden-piece');
            d.draggable = true; 
            if (newInitialLeft) {
                d.style.setProperty('left', newInitialLeft, 'important');
            } else {
                d.style.setProperty('left', d.dataset.initialLeft, 'important');
            }
            d.style.setProperty('top', d.dataset.initialTop, 'important'); 
            d.style.setProperty('z-index', '10', 'important'); 
        } else {
            d.classList.add('hidden-piece'); 
        }
    });

    selectionArea.classList.add('hidden');
    puzzleArea.classList.remove('hidden');
}


// -------------------------------------------------------------
// E. LÖSUNGSLOGIK & checkPosition
// -------------------------------------------------------------

function showSolution() {
    const piece = document.getElementById(currentPieceData.id);
    if (!piece) return;
    setLocationView(currentPieceData.location);
    const targetX = parseInt(piece.dataset.targetX); 
    const targetY = parseInt(piece.dataset.targetY);

    piece.style.left = `${targetX}px`;
    piece.style.top = `${targetY}px`;
    piece.draggable = false;
    piece.classList.add('solved');
    piece.classList.remove('hidden-piece'); 
    piece.classList.add('highlight-solution');

    feedbackElement.textContent = '✅ Lösung angezeigt.';
    feedbackElement.className = 'correct';
    feedbackElement.classList.remove('hidden');
    
    currentPieceIndex++;
    
    setTimeout(() => {
	piece.classList.remove('highlight-solution')
        feedbackElement.classList.add('hidden');
        feedbackElement.classList.remove('correct');
        startNextItemSelection(); 
    }, 1500);
}

function checkPosition(element, currentX, currentY) {

    if (currentViewLocation !== currentPieceData.location) {
        feedbackElement.textContent = `❌ Falsch. Das Teil gehört nicht in den Bereich **${currentViewLocation.toUpperCase()}**.`;
        feedbackElement.className = 'incorrect';
        feedbackElement.classList.remove('hidden');
        
        element.style.setProperty('left', element.dataset.initialLeft, 'important');
        element.style.setProperty('top', element.dataset.initialTop, 'important');
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 3000); 
        return; 
    }
    
    const targetX = parseInt(element.dataset.targetX); 
    const targetY = parseInt(element.dataset.targetY);
    const tolerance = 100; 

    const isCorrectX = Math.abs(currentX - targetX) < tolerance;
    const isCorrectY = Math.abs(currentY - targetY) < tolerance;

    if (isCorrectX && isCorrectY) {
        feedbackElement.textContent = '🎉 Richtig! Gut gemacht.';
        feedbackElement.className = 'correct';
        feedbackElement.classList.remove('hidden');
        
        element.style.left = `${targetX}px`;
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
        feedbackElement.textContent = '❌ Falsche Position. Versuch es nochmal genauer.';
        feedbackElement.className = 'incorrect';
        feedbackElement.classList.remove('hidden');
        
        element.style.setProperty('left', element.dataset.initialLeft, 'important');
        element.style.setProperty('top', element.dataset.initialTop, 'important');
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 1500);
    }
}


// -------------------------------------------------------------
// F. SICHERE INITIALISIERUNG (DER KRITISCHE TEIL)
// -------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. Element-Referenzen setzen (jetzt, wo sie garantiert existieren)
    selectionArea = document.getElementById('selection-area');
    itemPrompt = document.getElementById('item-prompt');
    choiceButtons = document.querySelectorAll('#location-controls .choice-button'); 
    targetImage = document.getElementById('target-image');
    feedbackElement = document.getElementById('feedback');
    puzzleArea = document.getElementById('puzzle-area');
    itemImage = document.getElementById('item-image'); 
    solveButton = document.getElementById('solve-button');
    itemCloseupImage = document.getElementById('item-closeup-image'); 
    allDraggables = document.querySelectorAll('.draggable');

    // 2. Daten laden (jetzt funktioniert es!)
    pieceOrder = loadPieceOrderFromDOM();
    
    if (pieceOrder.length > 0) {
        // 3. ZUFALLSGENERATOR AKTIVIEREN
        shuffleArray(pieceOrder);
        
        // 4. Erstes Teil der Liste setzen
        currentPieceData = pieceOrder[currentPieceIndex];
        
        // 5. Initialisierung starten
        initializeDraggables();
    } else {
        console.error("Fehler: Konnte keine Puzzleteile im HTML finden.");
        alert("Fehler beim Laden des Spiels (Keine Puzzleteile gefunden).");
    }
});