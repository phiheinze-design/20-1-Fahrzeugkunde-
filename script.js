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
    
    // 2. Verwalte die Sichtbarkeit und Ziehbarkeit der Teile (Element sichtbar machen)
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
            // Das AKTUELLE, UNGELÖSTE Teil: HIER WIRD ES SICHTBAR GEMACHT
            d.classList.remove('hidden-piece');
            d.draggable = true; 

            // Setze Position zurück (Dynamisch für Left, statisch für Top)
            if (newInitialLeft) {
                d.style.setProperty('left', newInitialLeft, 'important');
                d.dataset.currentStartLeft = newInitialLeft; // Aktuelle Startposition speichern
            } else {
                d.style.setProperty('left', d.dataset.initialLeft, 'important');
                d.dataset.currentStartLeft = d.dataset.initialLeft; // Fallback speichern
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


    // =======================================================================
    // NEU: ZWEI-SCHRITT-SCROLL-LOGIK FÜR MOBILE (Auto-Zoom-Überblick)
    // =======================================================================
    // Wir prüfen, ob der Bildschirm schmal ist (typisch für Handys)
    if (window.innerWidth < 1000) { 
        
        // --- SCHRITT 1: ÜBERSICHT (Auto-Scroll, um das Auto zu zeigen) ---
        const puzzleAreaRect = puzzleArea.getBoundingClientRect();
        
        window.scrollTo({
            // Scrollen zum linken Rand des Autos
            left: window.scrollX + puzzleAreaRect.left, 
            // Scrollen zum oberen Rand des Autos
            top: window.scrollY + puzzleAreaRect.top, 
            behavior: 'smooth'
        });

        // --- SCHRITT 2: FOKUS (Nach 800ms zum Puzzleteil scrollen) ---
        setTimeout(() => {
            const currentPieceElement = document.getElementById(currentPieceData.id);
            if (currentPieceElement) {
                // Scrollen zum Puzzleteil (es liegt rechts)
                // block: 'center' zentriert es vertikal im viewport
                // inline: 'center' zentriert es horizontal im viewport
                currentPieceElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center', 
                    inline: 'center' 
                });
            }
        }, 800); // 800ms Zeit, um das Auto anzusehen
    }
    // =======================================================================


    // ** KORRIGIERTE LOGIK MIT TIMEOUT: Messung der Höhe und Positionierung **
    // Wir verzögern die Messung (50ms), damit der Browser Zeit hat, das Bild zu rendern und die Höhe zu ermitteln.
    setTimeout(() => {
        if (staticDragHint) {
             // Verwende den AKTUELLEM Teil als Referenz
            const referenceDraggable = document.getElementById(currentPieceData.id); 
            
            // Stelle sicher, dass das Element existiert UND nicht gelöst ist
            if (referenceDraggable && !referenceDraggable.classList.contains('solved')) {
                // 1. Hole Start-Y (top)
                const initialTop = parseInt(referenceDraggable.dataset.initialTop) || 0;
                
                // 2. KORRIGIERTE MESSUNG: Lese die gerenderte Höhe in Pixeln aus
                const initialHeight = referenceDraggable.offsetHeight; 
                
                // 3. Definiere den Offset (15px unter dem Bild)
                const offsetY = 15;
                
                // 4. Berechne die neue Top-Position (unterhalb des Bildes)
                const hintTop = initialTop + initialHeight + offsetY; 
                
                // Position und Ausrichtung des Hints setzen
                staticDragHint.style.setProperty('left', newInitialLeft, 'important');
                staticDragHint.style.setProperty('top', `${hintTop}px`, 'important');
                
                // Korrektur für die Linksausrichtung (wie gewünscht)
                staticDragHint.style.setProperty('transform', 'none', 'important'); 
                staticDragHint.style.setProperty('text-align', 'left', 'important'); 
                
                // Zeige den Hint an
                staticDragHint.classList.remove('hidden');

                // Debugging-Ausgabe (Kontrolle)
                console.log(`[DEBUG HINT POS - TIMEOUT] Measured Height (offsetHeight): ${initialHeight}px`);
            } else if (staticDragHint) {
                 // Hint verstecken, wenn gelöst oder nicht gefunden
                 staticDragHint.classList.add('hidden');
            }
        }
    }, 50); // Kleiner Timeout von 50ms ist meistens ausreichend
}