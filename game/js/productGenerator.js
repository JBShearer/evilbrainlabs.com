// ============================================
// Procedural Product Generator
// ============================================

class ProductGenerator {
    constructor() {
        this.adjectives = [
            'Smart', 'Cloud', 'AI-Powered', 'Quantum', 'Blockchain-Based',
            'Neural', 'Augmented', 'Virtual', 'Holographic', 'Predictive',
            'Adaptive', 'Autonomous', 'Cognitive', 'Intelligent', 'Self-Learning',
            'Cyber', 'Digital', 'Hyper', 'Ultra', 'Meta', 'Nano', 'Bio',
            'Synergistic', 'Disruptive', 'Revolutionary', 'Next-Gen'
        ];

        this.nouns = [
            'Toaster', 'Blender', 'Refrigerator', 'Dishwasher', 'Vacuum',
            'Mirror', 'Toilet', 'Doorbell', 'Lightbulb', 'Thermostat',
            'Coffee Maker', 'Microwave', 'Oven', 'Fan', 'Speaker',
            'Alarm Clock', 'Pen', 'Stapler', 'Notebook', 'Calculator',
            'Sock Sorter', 'Shoe Tying Assistant', 'Pillow', 'Chair', 'Desk',
            'Fork', 'Spoon', 'Plate', 'Cup', 'Napkin Holder',
            'Doorknob', 'Carpet', 'Curtain', 'Window', 'Mailbox',
            'Plant Pot', 'Trash Can', 'Paper Shredder', 'Staple Remover'
        ];

        this.features = [
            'with Voice Control',
            'with Blockchain Verification',
            'with Cloud Sync',
            'with AI Prediction',
            'with Neural Interface',
            'with Quantum Computing',
            'with Self-Cleaning Technology',
            'with Emotional Intelligence',
            'with Social Media Integration',
            'with Cryptocurrency Mining',
            'with VR Support',
            'with Mood Detection',
            'with Personality Learning',
            'with Sentience (Beta)',
            'with Existential Dread Prevention',
            'with Mandatory Updates',
            'with Subscription Service',
            'with Data Collection',
            'that Judges You',
            'that Calls Your Mom'
        ];

        this.problems = [
            'Nobody asked for this',
            'Solves a problem that doesn\'t exist',
            'Makes everything slightly worse',
            'Requires 17 apps to work',
            'Only works on Tuesdays',
            'Constantly needs firmware updates',
            'Inexplicably connects to the internet',
            'Tracks everything you do',
            'Requires a monthly subscription',
            'Breaks after the warranty expires',
            'Is sentient but pretends not to be',
            'Secretly reports to The Brain',
            'Costs more than your rent',
            'Probably violates several laws',
            'Was designed by an AI that hates humans'
        ];
    }

    generate() {
        const adj = this.randomFrom(this.adjectives);
        const noun = this.randomFrom(this.nouns);
        const feature = this.randomFrom(this.features);
        const problem = this.randomFrom(this.problems);

        return {
            name: `${adj} ${noun} ${feature}`,
            problem: problem,
            marketability: Math.floor(Math.random() * 100),
            absurdity: Math.floor(Math.random() * 100)
        };
    }

    generateBatch(count = 3) {
        const products = [];
        for (let i = 0; i < count; i++) {
            products.push(this.generate());
        }
        return products;
    }

    randomFrom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    // Generate product with specific theme
    generateThemed(theme) {
        const themes = {
            'kitchen': {
                nouns: ['Toaster', 'Blender', 'Coffee Maker', 'Microwave', 'Refrigerator', 'Fork', 'Spoon', 'Plate'],
                features: ['with Voice Control', 'with Recipe Suggestions', 'with Calorie Counting', 'that Orders Groceries']
            },
            'office': {
                nouns: ['Stapler', 'Pen', 'Calculator', 'Paper Shredder', 'Desk', 'Chair'],
                features: ['with Productivity Tracking', 'with Meeting Scheduler', 'with Synergy Detection', 'that Writes Emails']
            },
            'home': {
                nouns: ['Doorbell', 'Lightbulb', 'Thermostat', 'Mirror', 'Toilet', 'Window'],
                features: ['with Smart Home Integration', 'with Security Monitoring', 'with Mood Lighting', 'that Talks to You']
            },
            'absurd': {
                nouns: ['Sock Sorter', 'Napkin Holder', 'Doorknob', 'Carpet', 'Paper Clip'],
                features: ['with Existential Dread Prevention', 'that Judges You', 'with Sentience (Beta)', 'that Calls Your Mom']
            }
        };

        const themeData = themes[theme] || { nouns: this.nouns, features: this.features };

        const adj = this.randomFrom(this.adjectives);
        const noun = this.randomFrom(themeData.nouns);
        const feature = this.randomFrom(themeData.features);
        const problem = this.randomFrom(this.problems);

        return {
            name: `${adj} ${noun} ${feature}`,
            problem: problem,
            theme: theme,
            marketability: Math.floor(Math.random() * 100),
            absurdity: Math.floor(Math.random() * 100)
        };
    }

    // Generate increasingly absurd products based on loop count
    generateForLoop(loopCount) {
        const absurdityLevel = Math.min(loopCount * 20, 100);

        // More loops = more ridiculous combinations
        if (loopCount > 3) {
            const combo = `${this.randomFrom(this.adjectives)} ${this.randomFrom(this.adjectives)} ${this.randomFrom(this.nouns)} ${this.randomFrom(this.features)} ${this.randomFrom(this.features)}`;
            return {
                name: combo,
                problem: this.randomFrom(this.problems),
                marketability: Math.max(0, 100 - absurdityLevel),
                absurdity: absurdityLevel,
                loopCount: loopCount
            };
        }

        return this.generate();
    }
}

// Global product generator instance
const productGenerator = new ProductGenerator();
