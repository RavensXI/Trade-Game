document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing game...');
        const game = new Game();
        await game.initialize();
        console.log('Game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
        document.body.innerHTML = `
            <div style="color: red; padding: 2rem; text-align: center;">
                <h2>Error Loading Game</h2>
                <p>There was an error initializing the game. Please check the console for details.</p>
            </div>
        `;
    }
}); 