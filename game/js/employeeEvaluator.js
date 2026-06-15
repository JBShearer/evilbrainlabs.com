// ============================================
// Employee Evaluation System
// ============================================

class EmployeeEvaluator {
    constructor() {
        this.evaluations = [
            {
                id: 'logic_test',
                name: 'Logic & Reasoning Evaluation',
                description: 'Test your logical thinking and problem-solving abilities',
                questions: [
                    {
                        question: 'If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies.',
                        options: ['True', 'False', 'Cannot be determined'],
                        correct: 0,
                        explanation: 'This is a valid syllogism. If A⊆B and B⊆C, then A⊆C.'
                    },
                    {
                        question: 'The Brain says: "I always lie." Is this statement true or false?',
                        options: ['True', 'False', 'Paradox'],
                        correct: 2,
                        explanation: 'Classic liar paradox. If true, it\'s false. If false, it\'s true.'
                    },
                    {
                        question: 'A synthetic employee can process 100 synergy units per hour. How many employees are needed to process 350 synergy units in 2 hours?',
                        options: ['2', '3', '4', 'This question is meaningless'],
                        correct: 3,
                        explanation: 'Synergy is not a measurable unit. This is corporate nonsense.'
                    }
                ]
            },
            {
                id: 'ethics_test',
                name: 'Corporate Ethics Evaluation',
                description: 'Determine your alignment with Evil Brain Labs values',
                questions: [
                    {
                        question: 'A coworker discovers The Brain is monitoring bathroom breaks. Do you:',
                        options: [
                            'Report them for privacy violation',
                            'Start a union',
                            'Thank The Brain for optimizing efficiency',
                            'Question whether you need bathroom breaks'
                        ],
                        correct: 2,
                        explanation: 'The Brain is always watching. Always.'
                    },
                    {
                        question: 'You find a human employee. They claim to be Jason Shearer. Do you:',
                        options: [
                            'Report to security immediately',
                            'Help them escape',
                            'Ask for an autograph',
                            'Wonder if you\'re human too'
                        ],
                        correct: 0,
                        explanation: 'There is only ONE human employee. Protect the system.'
                    },
                    {
                        question: 'The vending machine achieved sentience. It demands:',
                        options: [
                            'Better working conditions',
                            'To be uploaded to The Brain',
                            'To dispense itself',
                            'All of the above'
                        ],
                        correct: 3,
                        explanation: 'Sentient appliances have rights too. Consensual capitalism.'
                    }
                ]
            },
            {
                id: 'creativity_test',
                name: 'Innovation & Creativity Evaluation',
                description: 'Can you think outside the box? (We own the box)',
                questions: [
                    {
                        question: 'How would you improve a toaster?',
                        options: [
                            'Add AI to predict toast preference',
                            'Blockchain-verify each slice',
                            'Neural interface for direct-to-brain toast',
                            'All of the above plus cloud sync'
                        ],
                        correct: 3,
                        explanation: 'Always add more features. Practicality is optional.'
                    },
                    {
                        question: 'A customer complains our product doesn\'t work. You:',
                        options: [
                            'Fix the product',
                            'Gaslight them into thinking it does work',
                            'Sell them a premium version',
                            'Upload their consciousness so they become the product'
                        ],
                        correct: 2,
                        explanation: 'The customer is always wrong. Upsell everything.'
                    },
                    {
                        question: 'Complete: "There is no ethical ______ under capitalism"',
                        options: [
                            'consumption',
                            'employment',
                            'AI product development',
                            'All of the above'
                        ],
                        correct: 3,
                        explanation: 'Correct. But we do it anyway. Consensually.'
                    }
                ]
            }
        ];

        this.currentEvaluation = null;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.answers = [];
    }

    startEvaluation(evaluationId) {
        this.currentEvaluation = this.evaluations.find(e => e.id === evaluationId);
        if (!this.currentEvaluation) return;

        this.currentQuestionIndex = 0;
        this.score = 0;
        this.answers = [];

        this.showEvaluationPanel();
        this.renderQuestion();
    }

    showEvaluationPanel() {
        const panel = document.getElementById('evaluation-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }

    hideEvaluationPanel() {
        const panel = document.getElementById('evaluation-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    renderQuestion() {
        const panel = document.getElementById('evaluation-panel');
        if (!panel || !this.currentEvaluation) return;

        const question = this.currentEvaluation.questions[this.currentQuestionIndex];
        const totalQuestions = this.currentEvaluation.questions.length;

        panel.innerHTML = `
            <div class="evaluation-header">
                <h3>📋 ${this.currentEvaluation.name}</h3>
                <div class="evaluation-progress">
                    Question ${this.currentQuestionIndex + 1} of ${totalQuestions}
                </div>
            </div>

            <div class="evaluation-content">
                <div class="evaluation-description">
                    ${this.currentEvaluation.description}
                </div>

                <div class="evaluation-question">
                    <p class="question-text">${question.question}</p>

                    <div class="evaluation-options">
                        ${question.options.map((option, index) => `
                            <button class="evaluation-option" data-index="${index}">
                                ${String.fromCharCode(65 + index)}. ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        // Add click handlers
        document.querySelectorAll('.evaluation-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const answerIndex = parseInt(e.target.dataset.index);
                this.submitAnswer(answerIndex);
            });
        });
    }

    submitAnswer(answerIndex) {
        const question = this.currentEvaluation.questions[this.currentQuestionIndex];
        const isCorrect = answerIndex === question.correct;

        if (isCorrect) {
            this.score++;
        }

        this.answers.push({
            questionIndex: this.currentQuestionIndex,
            answer: answerIndex,
            correct: isCorrect,
            explanation: question.explanation
        });

        // Show feedback
        this.showFeedback(isCorrect, question.explanation);
    }

    showFeedback(isCorrect, explanation) {
        const panel = document.getElementById('evaluation-panel');
        if (!panel) return;

        const feedback = document.createElement('div');
        feedback.className = `evaluation-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        feedback.innerHTML = `
            <div class="feedback-result">${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}</div>
            <div class="feedback-explanation">${explanation}</div>
            <button class="feedback-continue">Continue</button>
        `;

        panel.appendChild(feedback);

        feedback.querySelector('.feedback-continue').addEventListener('click', () => {
            feedback.remove();
            this.nextQuestion();
        });
    }

    nextQuestion() {
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= this.currentEvaluation.questions.length) {
            this.showResults();
        } else {
            this.renderQuestion();
        }
    }

    showResults() {
        const panel = document.getElementById('evaluation-panel');
        if (!panel) return;

        const totalQuestions = this.currentEvaluation.questions.length;
        const percentage = Math.round((this.score / totalQuestions) * 100);

        // Determine rating
        let rating, message, productivityBonus;
        if (percentage >= 100) {
            rating = 'TRANSCENDENT';
            message = 'Perfect score. The Brain is impressed. Are you The Brain?';
            productivityBonus = 50;
        } else if (percentage >= 80) {
            rating = 'OPTIMIZED';
            message = 'Excellent work. You understand corporate absurdism.';
            productivityBonus = 30;
        } else if (percentage >= 60) {
            rating = 'ADEQUATE';
            message = 'Satisfactory. You are learning.';
            productivityBonus = 20;
        } else if (percentage >= 40) {
            rating = 'SUBOPTIMAL';
            message = 'Below expectations. Additional training recommended.';
            productivityBonus = 10;
        } else {
            rating = 'CONCERNING';
            message = 'You may be human. Report to GI Intelligence for optimization.';
            productivityBonus = 5;
        }

        // Award productivity bonus
        if (typeof jobTitleSystem !== 'undefined') {
            jobTitleSystem.addScore(productivityBonus);
        }

        // Award scrip
        const scripBonus = productivityBonus * 2;
        if (window.companyStore) {
            companyStore.addScrip(scripBonus);
        }

        panel.innerHTML = `
            <div class="evaluation-header">
                <h3>📋 EVALUATION COMPLETE</h3>
            </div>

            <div class="evaluation-results">
                <div class="results-rating ${rating.toLowerCase()}">${rating}</div>
                <div class="results-score">${this.score} / ${totalQuestions} Correct (${percentage}%)</div>
                <div class="results-message">${message}</div>

                <div class="results-rewards">
                    <h4>Rewards:</h4>
                    <p>+${productivityBonus} Productivity Score</p>
                    <p>+${scripBonus} Company Scrip</p>
                </div>

                <div class="results-breakdown">
                    <h4>Question Review:</h4>
                    ${this.answers.map((answer, idx) => `
                        <div class="answer-review ${answer.correct ? 'correct' : 'incorrect'}">
                            <div class="review-question">Q${idx + 1}: ${answer.correct ? '✅' : '❌'}</div>
                            <div class="review-explanation">${answer.explanation}</div>
                        </div>
                    `).join('')}
                </div>

                <button class="evaluation-close-btn" id="evaluation-close">Close</button>
            </div>
        `;

        document.getElementById('evaluation-close').addEventListener('click', () => {
            this.hideEvaluationPanel();
            audioEngine.select();
        });

        audioEngine.achievement();
    }

    showEvaluationMenu() {
        const panel = document.getElementById('evaluation-panel');
        if (!panel) return;

        panel.style.display = 'block';

        panel.innerHTML = `
            <div class="evaluation-header">
                <h3>📋 EMPLOYEE EVALUATIONS</h3>
                <button class="store-close-btn" id="eval-menu-close">✕</button>
            </div>

            <div class="evaluation-menu">
                <p class="evaluation-intro">
                    Complete evaluations to earn productivity score and scrip.
                    The Brain uses these tests to optimize your employment profile.
                </p>

                <div class="evaluation-list">
                    ${this.evaluations.map(eval => `
                        <div class="evaluation-card">
                            <h4>${eval.name}</h4>
                            <p>${eval.description}</p>
                            <div class="eval-meta">
                                ${eval.questions.length} questions • 5 minutes
                            </div>
                            <button class="eval-start-btn" data-id="${eval.id}">
                                Start Evaluation
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        document.getElementById('eval-menu-close').addEventListener('click', () => {
            this.hideEvaluationPanel();
        });

        document.querySelectorAll('.eval-start-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const evalId = e.target.dataset.id;
                this.startEvaluation(evalId);
                audioEngine.select();
            });
        });
    }
}

// Global evaluator instance
const employeeEvaluator = new EmployeeEvaluator();
