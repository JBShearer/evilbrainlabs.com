// ============================================
// Graphics Engine - Retro Pixel Art
// ============================================

class GraphicsEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.width = 400;
        this.height = 300;
    }

    init() {
        // Create canvas if it doesn't exist
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.width = this.width;
            this.canvas.height = this.height;
            this.canvas.style.imageRendering = 'pixelated';
            this.canvas.style.width = '100%';
            this.canvas.style.height = 'auto';
            this.ctx = this.canvas.getContext('2d');
        }
        return this.canvas;
    }

    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // Draw Evil Brain Labs logo
    drawBrainLogo() {
        this.clear();
        const ctx = this.ctx;

        // Brain outline (pink)
        ctx.fillStyle = '#ff006e';

        // Main brain shape (simplified pixel brain)
        ctx.fillRect(150, 80, 100, 80);  // Main mass
        ctx.fillRect(140, 90, 10, 60);   // Left bump
        ctx.fillRect(250, 90, 10, 60);   // Right bump
        ctx.fillRect(160, 70, 80, 10);   // Top
        ctx.fillRect(160, 160, 80, 10);  // Bottom

        // Brain folds (darker pink)
        ctx.fillStyle = '#d90056';
        ctx.fillRect(170, 90, 20, 5);
        ctx.fillRect(190, 100, 20, 5);
        ctx.fillRect(210, 110, 20, 5);
        ctx.fillRect(170, 120, 20, 5);
        ctx.fillRect(190, 130, 20, 5);
        ctx.fillRect(210, 140, 20, 5);

        // Eyes (cyan)
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(170, 110, 15, 15);
        ctx.fillRect(215, 110, 15, 15);

        // Pupils (white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(175, 115, 5, 5);
        ctx.fillRect(220, 115, 5, 5);

        // Text
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EVIL BRAIN LABS', 200, 200);
        ctx.font = '12px monospace';
        ctx.fillText('Bad AI is Best AI', 200, 220);
    }

    // Draw conference room
    drawConferenceRoom() {
        this.clear();
        const ctx = this.ctx;

        // Table (brown)
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(50, 180, 300, 80);

        // Characters sitting at table
        // Robot (gray)
        ctx.fillStyle = '#808080';
        ctx.fillRect(80, 140, 40, 40);
        ctx.fillRect(85, 135, 10, 5);  // Antenna
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(90, 150, 8, 8);   // Eye
        ctx.fillRect(105, 150, 8, 8);

        // Mobile app (blue)
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(150, 140, 30, 50);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(155, 145, 20, 30);  // Screen

        // Plug (yellow)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(220, 150, 30, 30);
        ctx.fillRect(225, 145, 8, 5);   // Prong
        ctx.fillRect(237, 145, 8, 5);

        // Coffee cup manager (brown)
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(280, 150, 30, 30);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(285, 155, 20, 15);  // Label

        // Text
        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('YOUR TEAM', 200, 120);
    }

    // Draw hallway with prototypes
    drawHallway() {
        this.clear();
        const ctx = this.ctx;

        // Floor perspective lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 200);
        ctx.lineTo(200, 150);
        ctx.moveTo(400, 200);
        ctx.lineTo(200, 150);
        ctx.stroke();

        // Door at end
        ctx.fillStyle = '#444444';
        ctx.fillRect(175, 100, 50, 80);
        ctx.fillStyle = '#ff006e';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('APPENDIX C', 200, 140);

        // Prototypes on sides
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(30, 180, 30, 30);  // Left prototype
        ctx.fillRect(340, 180, 30, 30); // Right prototype

        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.fillText('HALLWAY', 200, 250);
    }

    // Draw sock with emotion detector
    drawSockSorter() {
        this.clear();
        const ctx = this.ctx;

        // Sock (white)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(100, 120, 40, 60);
        ctx.fillRect(100, 180, 40, 10);

        // AI scanner (cyan beams)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.moveTo(120, 150 + i * 10);
            ctx.lineTo(200, 150 + i * 10);
            ctx.stroke();
        }

        // Sad face → Happy face
        ctx.fillStyle = '#ff006e';
        ctx.font = '30px monospace';
        ctx.fillText('😰', 220, 150);
        ctx.fillText('→', 260, 150);
        ctx.fillText('😌', 290, 150);

        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('EMOTIONAL FREQUENCY SCAN', 200, 220);
        ctx.fillText('DREAD: DETECTED', 200, 240);
        ctx.fillText('SOCKS: MATCHED', 200, 260);
    }

    // Draw brainstorm whiteboard
    drawBrainstorm() {
        this.clear();
        const ctx = this.ctx;

        // Whiteboard
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(50, 40, 300, 200);

        // Ideas on board
        ctx.fillStyle = '#000000';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('> AI Meeting Liar', 70, 70);
        ctx.fillText('> Blockchain Dog', 70, 95);
        ctx.fillText('> Dream Judge', 70, 120);
        ctx.fillText('> Procrastinate AI', 70, 145);

        // Lightbulb icon
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(160, 170, 20, 25);
        ctx.fillRect(165, 165, 10, 5);
        ctx.fillRect(165, 195, 10, 3);

        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BRAINSTORM SESSION', 200, 270);
    }

    // Draw product launch
    drawProductLaunch() {
        this.clear();
        const ctx = this.ctx;

        // Stage
        ctx.fillStyle = '#444444';
        ctx.fillRect(0, 200, 400, 100);

        // Product box (center stage)
        ctx.fillStyle = '#ff006e';
        ctx.fillRect(150, 120, 100, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AI', 200, 150);
        ctx.font = '12px monospace';
        ctx.fillText('PRODUCT', 200, 170);

        // Spotlight
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(200, 0);
        ctx.lineTo(150, 120);
        ctx.lineTo(250, 120);
        ctx.closePath();
        ctx.fill();

        // Audience (dots)
        ctx.fillStyle = '#8b5cf6';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(30 + i * 35, 230, 10, 10);
        }

        ctx.fillStyle = '#00ff00';
        ctx.font = '14px monospace';
        ctx.fillText('PRODUCT LAUNCH', 200, 280);
    }

    // Draw success/trophy
    drawSuccess() {
        this.clear();
        const ctx = this.ctx;

        // Trophy (gold)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(175, 120, 50, 60);  // Cup
        ctx.fillRect(185, 100, 30, 20);  // Top
        ctx.fillRect(190, 180, 20, 30);  // Base

        // Handles
        ctx.fillRect(165, 130, 10, 30);
        ctx.fillRect(225, 130, 10, 30);

        // Sparkles
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(150, 90, 5, 5);
        ctx.fillRect(245, 95, 5, 5);
        ctx.fillRect(160, 200, 5, 5);
        ctx.fillRect(235, 205, 5, 5);

        ctx.fillStyle = '#00ff00';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SUCCESS!', 200, 250);
        ctx.font = '12px monospace';
        ctx.fillText('Senior Absurdist', 200, 270);
    }

    // Draw credits screen
    drawCredits() {
        this.clear();
        const ctx = this.ctx;

        // Brain logo small
        ctx.fillStyle = '#ff006e';
        ctx.fillRect(175, 80, 50, 40);
        ctx.fillStyle = '#06b6d4';
        ctx.fillRect(185, 95, 7, 7);
        ctx.fillRect(208, 95, 7, 7);

        ctx.fillStyle = '#00ff00';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('THANK YOU', 200, 160);
        ctx.font = '12px monospace';
        ctx.fillText('FOR PLAYING', 200, 180);
        ctx.fillText('evilbrainlabs.com', 200, 220);
    }

    // Draw based on node ID
    drawScene(nodeId) {
        const scenes = {
            'start': () => this.drawBrainLogo(),
            'meet_team': () => this.drawConferenceRoom(),
            'explore_hallway': () => this.drawHallway(),
            'sock_sorter_pitch': () => this.drawSockSorter(),
            'brainstorm_session': () => this.drawBrainstorm(),
            'product_launch': () => this.drawProductLaunch(),
            'ending_success': () => this.drawSuccess(),
            'credits': () => this.drawCredits()
        };

        const drawFunc = scenes[nodeId] || (() => this.drawBrainLogo());
        drawFunc();
    }
}

// Global graphics engine instance
const graphicsEngine = new GraphicsEngine();
