class GameMap {
    constructor() {
        this.map = null;
        this.markers = new Map();
        this.links = new Map();
        this.animations = new Map();  // Store animation elements and their intervals
        this.initialize();
    }

    initialize() {
        this.map = L.map('map', {
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 8
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Create product icons mapping
        this.productIcons = {
            'Cars': '🚗',
            'Electronics': '📱',
            'Energy': '⚡',
            'Oil': '🛢️',
            'Food Products': '🍲',
            'Agricultural Products': '🌾',
            'Textiles': '🧵',
            'Metals': '⚙️',
            'Chemicals': '🧪',
            'Pharmaceuticals': '💊',
            'Plastics': '📦',
            'Machinery': '🔧'
        };

        // Container for animations
        this.animationContainer = document.createElement('div');
        this.animationContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1000;
        `;
        document.body.appendChild(this.animationContainer);

        // Handle map movement
        this.map.on('move', () => this.updateAnimationPositions());
        this.map.on('zoom', () => this.updateAnimationPositions());
    }

    clearMarkersExcept(countryCode) {
        // Remove all markers except the specified country
        for (const [code, marker] of this.markers.entries()) {
            if (code !== countryCode) {
                this.map.removeLayer(marker);
                this.markers.delete(code);
            }
        }
    }

    clearAllLinks() {
        // Stop and remove all animations
        this.clearAllAnimations();

        // Clear all trade links
        for (const [_, link] of this.links.entries()) {
            this.map.removeLayer(link);
        }
        this.links.clear();
    }

    clearAllAnimations() {
        // Clear all animations
        for (const [_, animation] of this.animations.entries()) {
            if (animation.interval) {
                clearInterval(animation.interval);
            }
            if (animation.element && animation.element.parentNode) {
                animation.element.parentNode.removeChild(animation.element);
            }
        }
        this.animations.clear();
    }

    highlightCountry(countryCode) {
        // This will be implemented when we add country highlighting
    }

    addMarker(country) {
        if (!this.markers.has(country.code)) {
            const marker = L.marker([country.coordinates[0], country.coordinates[1]], {
                title: country.name
            }).addTo(this.map);
            
            this.markers.set(country.code, marker);
        }
    }

    addTradeLink(country1, country2) {
        const linkId = `${country1.code}-${country2.code}`;
        
        if (!this.links.has(linkId)) {
            const line = L.polyline([
                country1.coordinates,
                country2.coordinates
            ], {
                color: '#3388ff',
                weight: 2,
                opacity: 0.6
            }).addTo(this.map);
            
            this.links.set(linkId, line);

            // Get the trade info
            const tradeInfo = country1.tradeLinks[country2.name];
            if (tradeInfo && tradeInfo.product) {
                this.startContinuousAnimation(country1.coordinates, country2.coordinates, tradeInfo.product, linkId);
            }
        }
    }

    startContinuousAnimation(start, end, product, linkId) {
        const icon = document.createElement('div');
        icon.style.cssText = `
            position: absolute;
            font-size: 24px;
            z-index: 1000;
            filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.5));
            transition: all 2s linear;
            pointer-events: none;
            opacity: 0;
        `;
        icon.textContent = this.productIcons[product] || '📦';
        this.animationContainer.appendChild(icon);

        const animate = () => {
            // First, instantly move to start position with no transition and no opacity
            icon.style.transition = 'none';
            const startPoint = this.map.latLngToContainerPoint(L.latLng(start[0], start[1]));
            icon.style.left = `${startPoint.x}px`;
            icon.style.top = `${startPoint.y}px`;
            icon.style.opacity = '0';

            // Force reflow
            icon.offsetHeight;

            // Then set up the transition and animate to end position
            requestAnimationFrame(() => {
                icon.style.transition = 'all 2s linear';
                icon.style.opacity = '1';
                const endPoint = this.map.latLngToContainerPoint(L.latLng(end[0], end[1]));
                icon.style.left = `${endPoint.x}px`;
                icon.style.top = `${endPoint.y}px`;
            });
        };

        // Start the animation immediately
        animate();

        // Create an interval to repeat the animation
        const interval = setInterval(animate, 2500); // Increased slightly to ensure smooth transitions

        // Store the animation info
        this.animations.set(linkId, {
            element: icon,
            interval: interval,
            start: start,
            end: end
        });
    }

    updateAnimationPositions() {
        // Update positions of all active animations when the map moves
        for (const animation of this.animations.values()) {
            if (animation.element) {
                const startPoint = this.map.latLngToContainerPoint(L.latLng(animation.start[0], animation.start[1]));
                const endPoint = this.map.latLngToContainerPoint(L.latLng(animation.end[0], animation.end[1]));
                
                // If the element is currently invisible, it should be at the start position
                if (animation.element.style.opacity === '0') {
                    animation.element.style.transition = 'none';
                    animation.element.style.left = `${startPoint.x}px`;
                    animation.element.style.top = `${startPoint.y}px`;
                } else {
                    animation.element.style.left = `${endPoint.x}px`;
                    animation.element.style.top = `${endPoint.y}px`;
                }
            }
        }
    }
} 