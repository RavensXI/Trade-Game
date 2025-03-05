class Game {
    constructor() {
        console.log('=== Geography Trading Game v1.1 ===');
        console.log('Last updated: Flag fixes and trade info improvements');
        console.log('=======================================');
        
        this.map = null;
        this.currentCountry = null;
        this.countries = null;
        this.score = 0;
        this.streak = 0;
        this.streakStartCountry = null;  // Track the country that started the current streak
        this.firstChoice = null;
        this.secondChoice = null;
        this.selectedOptions = [];
        this.tradeData = new Map(); // Cache for trade data
    }

    async initialize() {
        this.map = new GameMap();
        await this.loadCountryData();
        this.setupEventListeners();
    }

    async loadCountryData() {
        try {
            console.log('=== Debug: Loading country data ===');
            const response = await fetch('/Trade-Game/src/data/countries.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const countryData = await response.json();
            
            // Debug: List all country flags and normalize country codes
            console.log('=== Debug: Country Flag URLs ===');
            Object.entries(countryData).forEach(([name, data]) => {
                // Normalize the country code to the correct format
                const originalCode = data.code;
                const normalizedCode = this.normalizeCountryCode(originalCode);
                data.code = normalizedCode; // Update the code in the data
                
                console.log(`Country: ${name}`);
                console.log(`  Original code: ${originalCode}`);
                console.log(`  Normalized code: ${normalizedCode}`);
                console.log(`  Flag URL: ${this.getCountryFlagUrl(normalizedCode)}`);
            });
            
            const sampleCountry = Object.entries(countryData)[0];
            console.log('Sample raw country data:', {
                name: sampleCountry[0],
                data: JSON.stringify(sampleCountry[1], null, 2)
            });
            
            // First pass: Create country objects
            this.countries = Object.entries(countryData).map(([name, data]) => ({
                name,
                code: data.code,
                coordinates: data.coordinates,
                tradeLinks: {}
            }));

            // Second pass: Create export relationships
            Object.entries(countryData).forEach(([countryName, data]) => {
                const country = this.countries.find(c => c.name === countryName);
                
                Object.entries(data.tradeLinks).forEach(([partnerName, tradeInfo]) => {
                    if (partnerName === countryName) {
                        console.warn(`Warning: Found self-referential trade link for ${countryName}`);
                        return;
                    }

                    // Parse values, ensuring they are numbers
                    let totalValue = Number(tradeInfo.totalTrade) || 0;
                    const topValue = Number(tradeInfo.topProductValue) || 0;

                    // Debug logging for specific countries
                    if ((countryName === 'Canada' && (partnerName === 'Saudi Arabia' || partnerName === 'Spain')) ||
                        ((countryName === 'Saudi Arabia' || countryName === 'Spain') && partnerName === 'Canada')) {
                        console.log('=== Debug: Trade Data Analysis ===');
                        console.log(`${countryName} -> ${partnerName}:`, {
                            rawData: tradeInfo,
                            parsedTotal: totalValue,
                            parsedTop: topValue,
                            direction: 'From source to destination'
                        });
                    }

                    // Total value should be at least equal to top product value
                    if (totalValue < topValue) {
                        console.log(`Fixing inconsistent data for ${countryName} -> ${partnerName}:`, {
                            originalTotal: totalValue,
                            topValue: topValue
                        });
                        totalValue = topValue;
                    }

                    if (countryName === 'Chile' || partnerName === 'Chile') {
                        console.log(`Debug: Processing trade link ${countryName} -> ${partnerName}:`, {
                            rawTotal: tradeInfo.totalValue,
                            parsedTotal: totalValue,
                            rawTop: tradeInfo.topProductValue,
                            parsedTop: topValue
                        });
                    }

                    // Add export link from current country to partner
                    country.tradeLinks[partnerName] = {
                        totalExportValue: totalValue,
                        topProductValue: topValue,
                        product: tradeInfo.topProduct
                    };
                });
            });
            
            // Log Chile's trade links specifically
            const chile = this.countries.find(c => c.name === 'Chile');
            if (chile) {
                console.log('=== Debug: Chile trade links ===');
                console.log(JSON.stringify(chile.tradeLinks, null, 2));
            }
            
            this.selectNewCountry();
            this.updateUI();
        } catch (error) {
            console.error('Error loading country data:', error);
            const tradePanel = document.querySelector('.trade-panel');
            tradePanel.innerHTML = `
                <div class="error-message" style="color: red; padding: 1rem;">
                    Error loading country data. Please check the console for details.
                </div>
            `;
        }
    }

    selectNewCountry() {
        if (!this.streakStartCountry) {
            // Calculate total trade volume for each country
            const countryTradeVolumes = this.countries.map(country => {
                const totalTrade = Object.values(country.tradeLinks)
                    .reduce((sum, link) => {
                        // Ensure we're using numbers
                        const tradeValue = Number(link.totalExportValue || link.totalTrade || 0);
                        return sum + tradeValue;
                    }, 0);
                return { 
                    country, 
                    totalTrade,
                    tradingPartners: Object.keys(country.tradeLinks).length
                };
            });

            // Sort by both trade volume and number of trading partners
            const sortedCountries = countryTradeVolumes
                .filter(c => c.tradingPartners >= 3) // Ensure country has enough trading partners
                .sort((a, b) => b.totalTrade - a.totalTrade);

            // Take top 60% of countries
            const topCount = Math.max(3, Math.floor(sortedCountries.length * 0.6));
            const topCountries = sortedCountries.slice(0, topCount);

            // Select random country from top traders
            const randomIndex = Math.floor(Math.random() * topCountries.length);
            this.currentCountry = topCountries[randomIndex].country;
            
            console.log('Selected new starting country:', {
                name: this.currentCountry.name,
                totalTrade: topCountries[randomIndex].totalTrade,
                tradingPartners: topCountries[randomIndex].tradingPartners
            });

            this.streakStartCountry = this.currentCountry;
            this.streak = 0;
        } else {
            // For subsequent countries during a streak, keep using random selection
            const randomIndex = Math.floor(Math.random() * this.countries.length);
            this.currentCountry = this.countries[randomIndex];
        }
        
        console.log('Selected new country:', this.currentCountry.name);
        console.log('Streak start country:', this.streakStartCountry?.name);
        this.updateOptionsForCurrentCountry();
    }

    generateOptions() {
        // This method is no longer needed as we're using actual trade partners
        return [];
    }

    setupEventListeners() {
        document.getElementById('option1').addEventListener('click', () => this.handleOptionClick(0));
        document.getElementById('option2').addEventListener('click', () => this.handleOptionClick(1));
        document.getElementById('option3').addEventListener('click', () => this.handleOptionClick(2));
        
        document.getElementById('submit-guess').addEventListener('click', () => this.validateGuess());
        document.getElementById('reset-choices').addEventListener('click', () => this.resetChoices());
    }

    getCountryFlag(countryCode) {
        // Map of country codes to flag emojis
        const flagEmojis = {
            'US': '🇺🇸', 'CN': '🇨🇳', 'JP': '🇯🇵', 'DE': '🇩🇪', 'GB': '🇬🇧',
            'FR': '🇫🇷', 'IT': '🇮🇹', 'CA': '🇨🇦', 'KR': '🇰🇷', 'IN': '🇮🇳',
            'AU': '🇦🇺', 'BR': '🇧🇷', 'RU': '🇷🇺', 'MX': '🇲🇽', 'ES': '🇪🇸',
            'ID': '🇮🇩', 'NL': '🇳🇱', 'SA': '🇸🇦', 'CH': '🇨🇭', 'TR': '🇹🇷',
            'PL': '🇵🇱', 'SE': '🇸🇪', 'BE': '🇧🇪', 'TH': '🇹🇭', 'IR': '🇮🇷',
            'SG': '🇸🇬', 'MY': '🇲🇾', 'GR': '🇬🇷', 'VN': '🇻🇳', 'PK': '🇵🇰',
            'IL': '🇮🇱'
        };
        return flagEmojis[countryCode] || '🏳️';
    }

    normalizeCountryCode(code) {
        // Special cases mapping for country codes
        const specialCases = {
            'ME': 'MX',  // Mexico
            'SW': 'SE',  // Sweden
            'NE': 'NL',  // Netherlands
            'CH': 'CN',  // China (when it means China)
            'MA': 'MY',  // Malaysia
            'IS': 'IL',  // Israel
            'TU': 'TR',  // Turkey
            'JA': 'JP',  // Japan
            'PA': 'PK',  // Pakistan
            'PO': 'PL',  // Poland
            'SP': 'ES',  // Spain
            'IN': 'ID',  // Indonesia (when it means Indonesia)
            'GE': 'DE',  // Germany
            'SI': 'SG',  // Singapore
            'UN': 'US',  // United States
            'SO': 'KR',  // South Korea
            'VI': 'VN',  // Vietnam
        };

        // Convert to uppercase for consistency
        const upperCode = code.toUpperCase();
        
        // Return the special case if it exists, otherwise return the original code
        return specialCases[upperCode] || upperCode;
    }

    getCountryFlagUrl(countryCode) {
        if (!countryCode) {
            console.warn('No country code provided for flag');
            return '';
        }

        // Normalize the country code
        const normalizedCode = this.normalizeCountryCode(countryCode);
        console.log('Getting flag URL for country:', countryCode);
        console.log('Normalized country code:', normalizedCode);
        
        // Generate flag URL using lowercase code
        const flagUrl = `https://flagcdn.com/w320/${normalizedCode.toLowerCase()}.png`;
        console.log('Generated flag URL:', flagUrl);
        
        return flagUrl;
    }

    updateUI() {
        if (this.currentCountry) {
            document.getElementById('current-country').textContent = this.currentCountry.name;
            document.getElementById('score').textContent = this.score;
            document.getElementById('streak').textContent = this.streak;
            
            // Update start country name and flag
            const startCountryElement = document.getElementById('start-country-name');
            const startCountryFlag = document.getElementById('start-country-flag');
            
            if (this.streakStartCountry) {
                console.log('Updating start country display:', {
                    name: this.streakStartCountry.name,
                    code: this.streakStartCountry.code
                });
                
                startCountryElement.textContent = this.streakStartCountry.name;
                const code = this.streakStartCountry.code.toLowerCase();
                const flagUrl = `https://flagcdn.com/w320/${code}.png`;
                
                // Set up the flag image with better error handling
                startCountryFlag.onerror = () => {
                    console.log('PNG flag failed to load, trying SVG...');
                    // Try SVG format
                    const svgUrl = `https://flagcdn.com/${code}.svg`;
                    startCountryFlag.src = svgUrl;
                    
                    // If SVG also fails, try another CDN
                    startCountryFlag.onerror = () => {
                        console.log('SVG flag failed to load, trying alternative CDN...');
                        startCountryFlag.src = `https://raw.githubusercontent.com/lipis/flag-icons/master/flags/4x3/${code}.svg`;
                        
                        // If all attempts fail, show a placeholder
                        startCountryFlag.onerror = () => {
                            console.error('All flag loading attempts failed');
                            startCountryFlag.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2Ij5GbGFnIG5vdCBhdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                        };
                    };
                };
                
                startCountryFlag.src = flagUrl;
                startCountryFlag.alt = `Flag of ${this.streakStartCountry.name}`;
                document.querySelector('.start-country-flag').style.display = 'block';
            } else {
                console.log('No start country set, hiding flag display');
                startCountryElement.textContent = '-';
                startCountryFlag.src = '';
                document.querySelector('.start-country-flag').style.display = 'none';
            }
        }
    }

    handleOptionClick(optionIndex) {
        const button = document.getElementById(`option${optionIndex + 1}`);
        const countryName = button.textContent.trim();
        const tradeInfo = this.currentCountry.tradeLinks[countryName];
        
        console.log('=== Debug: handleOptionClick ===');
        console.log('Current country:', this.currentCountry.name);
        console.log('Selected country:', countryName);
        console.log('Raw trade info:', JSON.stringify(tradeInfo, null, 2));
        
        if (!this.firstChoice) {
            // First selection
            this.firstChoice = { 
                name: countryName, 
                totalValue: tradeInfo.totalExportValue,
                topValue: tradeInfo.topProductValue,
                product: tradeInfo.product 
            };
            console.log('First choice set:', JSON.stringify(this.firstChoice, null, 2));
            document.getElementById('first-choice').textContent = countryName;
            document.getElementById('first-choice').classList.add('filled');
            button.classList.add('selected');
            this.selectedOptions.push(optionIndex);
        } else if (!this.secondChoice) {
            // Second selection
            this.secondChoice = { 
                name: countryName, 
                totalValue: tradeInfo.totalExportValue,
                topValue: tradeInfo.topProductValue,
                product: tradeInfo.product 
            };
            console.log('Second choice set:', JSON.stringify(this.secondChoice, null, 2));
            document.getElementById('second-choice').textContent = countryName;
            document.getElementById('second-choice').classList.add('filled');
            button.classList.add('selected');
            
            // Show submit and reset buttons
            document.getElementById('submit-guess').style.display = 'flex';
            document.getElementById('reset-choices').style.display = 'flex';
        }
    }

    validateGuess() {
        if (!this.firstChoice || !this.secondChoice) return;

        // Use top product value if total value is 0
        const firstValue = this.firstChoice.totalValue || this.firstChoice.topValue;
        const secondValue = this.secondChoice.totalValue || this.secondChoice.topValue;
        const isCorrect = firstValue > secondValue;
        
        if (isCorrect) {
            this.handleCorrectGuess();
        } else {
            this.handleIncorrectGuess();
        }

        // Hide the submit button after validation
        document.getElementById('submit-guess').style.display = 'none';
    }

    handleCorrectGuess() {
        this.score += CONFIG.basePoints * (1 + this.streak * CONFIG.streakMultiplier);
        this.streak++;
        
        // Find the trading partner country object
        const nextCountry = this.countries.find(c => c.name === this.firstChoice.name);
        
        if (nextCountry) {
            this.map.addTradeLink(this.currentCountry, nextCountry);
            
            // Get trade info for both countries
            const firstChoiceInfo = this.currentCountry.tradeLinks[this.firstChoice.name];
            const secondChoiceInfo = this.currentCountry.tradeLinks[this.secondChoice.name];
            
            // Show trade info first
            this.showTradeInfo(
                true,
                this.firstChoice.name,
                firstChoiceInfo.totalExportValue || firstChoiceInfo.totalTrade,
                firstChoiceInfo.product,
                firstChoiceInfo.topProductValue,
                this.secondChoice.name,
                secondChoiceInfo.totalExportValue || secondChoiceInfo.totalTrade,
                secondChoiceInfo.product,
                secondChoiceInfo.topProductValue
            );

            // Check if this was a successful loop closure
            if (this.firstChoice.name === this.streakStartCountry?.name && this.streak >= 3) {
                this.handleSuccessfulLoopClosure();
                return;
            }

            // Update current country after showing trade info
            this.currentCountry = nextCountry;
            this.updateUI();
        }
    }

    handleIncorrectGuess() {
        this.score = 0;  // Set score to 0 instead of applying penalty
        this.streak = 0;
        this.streakStartCountry = null;  // We'll set a new one when selecting new country
        this.map.clearAllLinks();
        
        // Get trade info for both countries
        const firstChoiceInfo = this.currentCountry.tradeLinks[this.firstChoice.name];
        const secondChoiceInfo = this.currentCountry.tradeLinks[this.secondChoice.name];
        
        // Use top product value if total value is 0
        const firstValue = firstChoiceInfo.totalExportValue || firstChoiceInfo.topProductValue;
        const secondValue = secondChoiceInfo.totalExportValue || secondChoiceInfo.topProductValue;
        
        console.log('=== Debug: Value Comparison ===');
        console.log(`First Choice (${this.firstChoice.name}):`, {
            totalValue: firstChoiceInfo.totalExportValue,
            topValue: firstChoiceInfo.topProductValue,
            usedValue: firstValue
        });
        console.log(`Second Choice (${this.secondChoice.name}):`, {
            totalValue: secondChoiceInfo.totalExportValue,
            topValue: secondChoiceInfo.topProductValue,
            usedValue: secondValue
        });
        console.log('Comparison result:', firstValue > secondValue);
        
        // Determine which country has higher exports
        const correctCountry = firstValue > secondValue ? this.firstChoice : this.secondChoice;
        const incorrectCountry = correctCountry === this.firstChoice ? this.secondChoice : this.firstChoice;
        
        // Get the trade info for correct and incorrect countries
        const correctTradeInfo = this.currentCountry.tradeLinks[correctCountry.name];
        const incorrectTradeInfo = this.currentCountry.tradeLinks[incorrectCountry.name];
        
        // Use top product values for display when total is 0
        const displayCorrectValue = correctTradeInfo.totalExportValue || correctTradeInfo.topProductValue;
        const displayIncorrectValue = incorrectTradeInfo.totalExportValue || incorrectTradeInfo.topProductValue;
        
        this.showTradeInfo(
            false, 
            correctCountry.name,
            displayCorrectValue,
            correctTradeInfo.product,
            correctTradeInfo.topProductValue,
            incorrectCountry.name,
            displayIncorrectValue,
            incorrectTradeInfo.product,
            incorrectTradeInfo.topProductValue
        );
        
        // Select a new country which will also set it as the new streak start country
        setTimeout(() => {
            this.selectNewCountry();
            this.updateUI();
        }, 2000);
    }

    resetChoices() {
        this.firstChoice = null;
        this.secondChoice = null;
        document.getElementById('first-choice').textContent = 'select first country';
        document.getElementById('second-choice').textContent = 'select second country';
        document.getElementById('first-choice').classList.remove('filled');
        document.getElementById('second-choice').classList.remove('filled');
        
        // Reset button states
        this.selectedOptions.forEach(index => {
            const button = document.getElementById(`option${index + 1}`);
            button.classList.remove('selected');
        });
        this.selectedOptions = [];
        
        // Hide submit and reset buttons
        document.getElementById('submit-guess').style.display = 'none';
        document.getElementById('reset-choices').style.display = 'none';
    }

    handleSuccessfulLoopClosure() {
        // Save high score
        const highScore = localStorage.getItem('highScore') || 0;
        if (this.score > highScore) {
            localStorage.setItem('highScore', this.score);
        }

        // Remove any existing overlay first
        const existingOverlay = document.querySelector('.victory-overlay');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }

        // Create a full-screen overlay
        const overlay = document.createElement('div');
        overlay.className = 'victory-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        // Create victory message
        const victoryDiv = document.createElement('div');
        victoryDiv.className = 'victory-message';
        victoryDiv.style.cssText = `
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 90%;
            text-align: center;
            position: relative;
            animation: fadeInScale 0.5s ease-out;
        `;

        victoryDiv.innerHTML = `
            <style>
                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .victory-message button:hover {
                    background: #27ae60 !important;
                    transform: translateY(-2px) !important;
                }
            </style>
            <h2 style="font-size: 32px; margin-bottom: 24px; color: #2c3e50;">🎉 Congratulations! 🎉</h2>
            <p style="font-size: 22px; margin-bottom: 30px; color: #34495e;">You've successfully closed the trade loop with ${this.streak} correct guesses!</p>
            <div style="background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 30px;">
                <p style="font-size: 28px; font-weight: bold; margin-bottom: 16px; color: #2c3e50;">Final Score: ${this.score.toLocaleString()}</p>
                <p style="font-size: 20px; color: #7f8c8d;">High Score: ${Math.max(this.score, highScore).toLocaleString()}</p>
                <p style="font-size: 18px; color: #95a5a6; margin-top: 16px;">Starting Country: ${this.streakStartCountry.name}</p>
            </div>
            <button id="playAgainBtn" style="
                width: 240px;
                padding: 16px;
                font-size: 20px;
                background: #2ecc71;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 0 auto;
                display: block;
                font-weight: 500;
            ">Play Again</button>
        `;

        // Add the overlay and victory message to the body
        overlay.appendChild(victoryDiv);
        document.body.appendChild(overlay);

        // Add play again button listener
        const playAgainBtn = document.getElementById('playAgainBtn');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                this.resetGame();
            });
        }

        // Also allow clicking outside the victory message to dismiss
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                this.resetGame();
            }
        });
    }

    resetGame() {
        this.score = 0;
        this.streak = 0;
        this.streakStartCountry = null;
        this.map.clearAllLinks();
        this.selectNewCountry();
        this.updateUI();
        this.resetChoices();
    }

    async updateOptionsForCurrentCountry() {
        console.log('Current streak:', this.streak);
        console.log('Current country:', this.currentCountry?.name);
        console.log('Streak start country:', this.streakStartCountry?.name);
        
        // Only clear markers, keep the trade links
        this.map.clearMarkersExcept(this.currentCountry.code);
        
        try {
            // Get trading partners from our local data
            const tradingPartners = Object.keys(this.currentCountry.tradeLinks)
                .filter(partner => {
                    // Don't include current country
                    if (partner === this.currentCountry.name) return false;
                    
                    // Don't include the country we just came from (prevent backtracking)
                    const tradeLinks = Array.from(this.map.links.values());
                    const lastLink = tradeLinks[tradeLinks.length - 1];
                    if (lastLink) {
                        const lastCountry = this.countries.find(c => 
                            c.coordinates[0] === lastLink.getLatLngs()[0].lat &&
                            c.coordinates[1] === lastLink.getLatLngs()[0].lng
                        );
                        if (lastCountry && partner === lastCountry.name) return false;
                    }
                    
                    // Don't include countries already in our trade chain (except starting country after 3 correct)
                    const isInChain = Array.from(this.map.links.values()).some(link => {
                        const country = this.countries.find(c => 
                            c.coordinates[0] === link.getLatLngs()[1].lat &&
                            c.coordinates[1] === link.getLatLngs()[1].lng
                        );
                        return country && country.name === partner;
                    });
                    
                    // Allow starting country if streak >= 3
                    if (partner === this.streakStartCountry?.name) {
                        return this.streak >= 3;
                    }
                    
                    return !isInChain;
                });
            
            console.log('Available trading partners:', tradingPartners);
            
            if (tradingPartners.length < 2) {
                console.log('Not enough trading partners, selecting new country');
                this.selectNewCountry();
                return;
            }
            
            // Sort partners by trade value for better gameplay
            const sortedPartners = tradingPartners.sort((a, b) => 
                this.currentCountry.tradeLinks[b].totalExportValue - 
                this.currentCountry.tradeLinks[a].totalExportValue
            );
            
            // Take three random partners from top half of trading partners
            const topHalf = sortedPartners.slice(0, Math.max(3, Math.floor(sortedPartners.length / 2)));
            let selectedPartners = topHalf
                .sort(() => Math.random() - 0.5)
                .slice(0, this.streak >= 3 && this.streakStartCountry ? 2 : 3);
            
            // If streak >= 3 and we have starting country, ensure it's included
            if (this.streak >= 3 && this.streakStartCountry && 
                !selectedPartners.includes(this.streakStartCountry.name)) {
                selectedPartners.push(this.streakStartCountry.name);
            }

            // Update the option buttons
            selectedPartners.forEach((partner, index) => {
                const tradeInfo = this.currentCountry.tradeLinks[partner];
                const button = document.getElementById(`option${index + 1}`);
                if (button) {
                    button.textContent = partner;
                    button.setAttribute('data-trade-value', tradeInfo.totalExportValue);
                    button.setAttribute('data-top-product', tradeInfo.product);
                    button.style.display = 'block';
                }
            });

            // Show/hide third button
            const thirdButton = document.getElementById('option3');
            if (thirdButton) {
                thirdButton.style.display = selectedPartners.length > 2 ? 'block' : 'none';
            }

            // Add marker for current country
            this.map.addMarker(this.currentCountry);
            
        } catch (error) {
            console.error('Error updating options:', error);
        }
    }

    showTradeInfo(correct, country, totalValue, topProduct, topValue, correctCountry, correctTotalValue, correctTopProduct, correctTopValue) {
        const tradePanel = document.querySelector('.trade-panel');
        
        // Remove any existing trade info
        const existingInfo = tradePanel.querySelector('.trade-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = `trade-info ${correct ? 'correct' : 'incorrect'}`;
        
        // Helper function to format money values
        const formatMoney = (value) => {
            value = Number(value) || 0;
            if (value >= 1000000) {
                const billions = value / 1000000;
                return `$${billions.toLocaleString('en-US', {maximumFractionDigits: 1})}B`;
            } else {
                const millions = value / 1000;
                return `$${millions.toLocaleString('en-US', {maximumFractionDigits: 1})}M`;
            }
        };
        
        if (correct) {
            // For correct guesses, first choice is higher (winner)
            const difference = totalValue - correctTotalValue;
            
            infoDiv.innerHTML = `
                <p style="font-size: 1.2em; margin-bottom: 15px;">Correct!</p>
                <p>${this.currentCountry.name} exports more to ${country} than to ${correctCountry}</p>
                <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Total exports to ${country}:</strong> ${formatMoney(totalValue)}</p>
                    <p><strong>Main export:</strong> ${topProduct} (${formatMoney(topValue)})</p>
                </div>
                <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Total exports to ${correctCountry}:</strong> ${formatMoney(correctTotalValue)}</p>
                    <p><strong>Main export:</strong> ${correctTopProduct} (${formatMoney(correctTopValue)})</p>
                </div>
                <p style="font-weight: bold; margin: 15px 0;">Difference in total exports: ${formatMoney(difference)}</p>
                <button class="continue-button" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-size: 1em;
                    cursor: pointer;
                    margin-top: 15px;
                    transition: background 0.3s;
                    width: 100%;
                ">Continue</button>
            `;

            const continueButton = infoDiv.querySelector('.continue-button');
            continueButton.addEventListener('click', () => {
                infoDiv.remove();
                this.resetChoices();
                this.updateOptionsForCurrentCountry();
            });
        } else {
            // Keep existing incorrect guess handling
            const difference = Math.abs(correctTotalValue - totalValue);
            const higherCountry = correctTotalValue > totalValue ? correctCountry : country;
            const lowerCountry = correctTotalValue > totalValue ? country : correctCountry;
            const higherValue = correctTotalValue > totalValue ? correctTotalValue : totalValue;
            const lowerValue = correctTotalValue > totalValue ? totalValue : correctTotalValue;
            const higherProduct = correctTotalValue > totalValue ? correctTopProduct : topProduct;
            const lowerProduct = correctTotalValue > totalValue ? topProduct : correctTopProduct;
            const higherTopValue = correctTotalValue > totalValue ? correctTopValue : topValue;
            const lowerTopValue = correctTotalValue > totalValue ? topValue : correctTopValue;
            
            infoDiv.innerHTML = `
                <p style="font-size: 1.2em; margin-bottom: 15px;">Incorrect!</p>
                <p>${this.currentCountry.name} exports more to ${higherCountry} than to ${lowerCountry}</p>
                <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Total exports to ${higherCountry}:</strong> ${formatMoney(higherValue)}</p>
                    <p><strong>Main export:</strong> ${higherProduct} (${formatMoney(higherTopValue)})</p>
                </div>
                <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p><strong>Total exports to ${lowerCountry}:</strong> ${formatMoney(lowerValue)}</p>
                    <p><strong>Main export:</strong> ${lowerProduct} (${formatMoney(lowerTopValue)})</p>
                </div>
                <p style="font-weight: bold; margin: 15px 0;">Difference in total exports: ${formatMoney(difference)}</p>
                <button class="try-again-button" style="
                    background: #4CAF50;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    font-size: 1em;
                    cursor: pointer;
                    margin-top: 15px;
                    transition: background 0.3s;
                ">Try Again</button>
            `;

            const tryAgainButton = infoDiv.querySelector('.try-again-button');
            tryAgainButton.addEventListener('click', () => {
                infoDiv.remove();
                this.resetChoices();
                this.updateOptionsForCurrentCountry();
            });
        }
        
        tradePanel.appendChild(infoDiv);
    }
} 