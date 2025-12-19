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
shuffleArray(pieceOrder)

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
const itemCloseupImage = document.getElementById('item-closeup-image'); // <--- DIESE ZEILE HINZUFÜGEN

// Drag-and-Drop Variablen
const draggables = document.querySelectorAll('.draggable');
const allDraggables = draggables;
let currentDraggedElement = null;
let offset = { x: 0, y: 0 };


// -------------------------------------------------------------
// B. HILFSFUNKTIONEN ZUM SPEICHERN DER STARTSTYLES
// -------------------------------------------------------------
function initializeDraggables() {
    allDraggables.forEach(d => {
        // Wir speichern nur TOP und Breite/Höhe, da LEFT dynamisch berechnet wird
        d.dataset.initialLeft = d.style.left; // Nur als Fallback/Referenz
        d.dataset.initialTop = d.style.top;
        d.dataset.initialWidth = d.style.width;
        d.dataset.initialHeight = d.style.height;
        
        d.draggable = true; 
    });
	//showAllSolutions('links');
	//showAllSolutions('rechts');
	//showAllSolutions('kabine');
	//showAllSolutions('hinten');
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
       
        const closeupSource = currentDraggableElement.dataset.closeupsrc; // Liest das neue Attribut aus
		
        if (itemCloseupImage) {
            if (closeupSource) {
                 itemCloseupImage.src = closeupSource;
                 itemCloseupImage.alt = `Nahaufnahme von ${currentPieceData.name}`;
                 itemCloseupImage.classList.remove('hidden'); // Macht das Bild sichtbar (entfernt die 'hidden' Klasse)
            } else {
                 itemCloseupImage.src = '';
                 itemCloseupImage.classList.add('hidden'); // Versteckt das Bild, falls kein Pfad vorhanden
            }
        }
        // Ende NEU
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
// D. GROBE POSITION WECHSELN/KORRIGIEREN (Zentralisierte Logik)
// -------------------------------------------------------------



function setLocationView(location) {
    currentViewLocation = location;
    
    let newInitialLeft = null;

    // Größe des Containers anpassen
    const size = locationSizes[location];
    if (size) {
        puzzleArea.style.width = size.width; 
        puzzleArea.style.height = size.height;
        
        // 🚀 NEU: Dynamische Left-Berechnung
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
                // 🚀 HIER: Dynamische Left-Position anwenden
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
// E. LÖSUNGSLOGIK
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
// F. EVENT LISTENERS
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
// G. DRAG & DROP LOGIK
// -------------------------------------------------------------

draggables.forEach(draggable => {
    draggable.addEventListener('dragstart', (e) => {
        
        // Verhindere das Ziehen basierend auf der 'draggable'-Eigenschaft
        if (draggable.draggable === false) { 
             e.preventDefault(); 
             return;
        }

        currentDraggedElement = draggable;
        const rect = draggable.getBoundingClientRect();
        offset.x = e.clientX - rect.left;
        offset.y = e.clientY - rect.top;
	e.dataTransfer.setDragImage(draggable, offset.x, offset.y); 

        // Nur für die Drag-API: Daten setzen (kann leer sein, aber muss sein)
        e.dataTransfer.setData('text/plain', draggable.id);
        draggable.classList.add('is-dragging'); 
    });
});

puzzleArea.addEventListener('dragover', (e) => {
    e.preventDefault(); 
});

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


// -------------------------------------------------------------
// H. FEINPOSITION PRÜFEN (checkPosition)
// -------------------------------------------------------------

function checkPosition(element, currentX, currentY) {

    if (currentViewLocation !== currentPieceData.location) {
        // Falscher Hintergrund gewählt! 
        feedbackElement.textContent = `❌ Falsch. Das Teil gehört nicht in den Bereich **${currentViewLocation.toUpperCase()}**.`;
        feedbackElement.className = 'incorrect';
        feedbackElement.classList.remove('hidden');
        
        // Element zur Startposition zurücksetzen
        element.style.setProperty('left', element.dataset.initialLeft, 'important');
        element.style.setProperty('top', element.dataset.initialTop, 'important');
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 3000); 
        return; 
    }
    
    // --- Wenn die Location KORREKT ist, prüfe die Feinposition ---
    const targetX = parseInt(element.dataset.targetX); 
    const targetY = parseInt(element.dataset.targetY);
    const tolerance = 100; 


    console.log(`--- KOORDINATEN FÜR ${element.id} ---`);
    console.log(`data-target-x="${Math.round(currentX)}"`);
    console.log(`data-target-y="${Math.round(currentY)}"`);
    console.log('------------------------------------------------');
    // ----------------------------------------------------

    const isCorrectX = Math.abs(currentX - targetX) < tolerance;
    const isCorrectY = Math.abs(currentY - targetY) < tolerance;

    if (isCorrectX && isCorrectY) {
        // POSITIVES Feedback & Einrasten (Location und Position sind richtig)
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
        // NEGATIVES Feedback (Location ist richtig, aber Position ist falsch)
        feedbackElement.textContent = '❌ Falsche Position. Versuch es nochmal genauer.';
        feedbackElement.className = 'incorrect';
        feedbackElement.classList.remove('hidden');
        
        // Element zur Startposition zurücksetzen (Verwendet nun initialTop/Left)
        element.style.setProperty('left', element.dataset.initialLeft, 'important');
        element.style.setProperty('top', element.dataset.initialTop, 'important');
        
        setTimeout(() => {
            feedbackElement.classList.add('hidden');
            feedbackElement.classList.remove('incorrect');
        }, 1500);
    }
}


// -------------------------------------------------------------
// E. DEBUG-FUNKTION (DIE GEWÜNSCHTE GESAMTLÖSUNG)
// -------------------------------------------------------------

/**
 * Zeigt alle Puzzleteile für eine bestimmte Location an ihren Zielkoordinaten an.
 * Dies ist ein reines Debugging-Tool für die Programmerstellung.
 * @param {string} locationToShow - Die Location, deren Lösung angezeigt werden soll (z.B. 'links', 'kabine').
 */
function showAllSolutions(locationToShow) {
    if (!locationToShow) {
        console.error("⛔ Bitte geben Sie die Location an, z.B. showAllSolutions('links')");
        return;
    }

    // 1. Setze die Ansicht auf die gewünschte Location (Hintergrund und Containergröße)
    setLocationView(locationToShow);
    selectionArea.classList.add('hidden');
    puzzleArea.classList.remove('hidden');

    // 2. Iteriere über alle Puzzleteile und platziere sie
    document.querySelectorAll('.draggable').forEach(element => {
        // Prüfe, ob das Teil zur aktuellen Location gehört
        if (element.dataset.location === locationToShow) {
            const targetX = parseInt(element.dataset.targetX);
            const targetY = parseInt(element.dataset.targetY);

            // Mache das Teil sichtbar
            element.classList.remove('hidden-piece');
            
            // Setze die korrekte Position
            element.style.left = `${targetX}px`;
            element.style.top = `${targetY}px`;
            
            // Stelle sicher, dass die korrekte Größe verwendet wird (aus den initial gespeicherten Werten)
            element.style.width = element.dataset.initialWidth;
            element.style.height = element.dataset.initialHeight;
            
            // Markiere als gelöst und deaktiviere Dragging
            element.classList.add('solved');
            element.draggable = false;
        } else {
            // Teile, die nicht zur aktuellen Location gehören, verstecken
            element.classList.add('hidden-piece');
        }
    });

    console.log(`✅ Alle Teile für Location '${locationToShow}' wurden an ihren Zielpositionen platziert.`);
}


// -------------------------------------------------------------
// F. START
// -------------------------------------------------------------
initializeDraggables();

initializeDraggables();