# 🎲 Fair Dice Game - Coding Task

This project implements a command-line dice game with HMAC-based fair random number generation to ensure transparency and trustworthiness in gameplay.

### 📌 Task Summary
A game where:
- The computer selects a number, hides it using HMAC.
- The user provides input.
- The result is calculated using `(computerNumber + userNumber) % rangeSize`.
- The HMAC key is revealed after the input to verify fairness.

---

### 💡 Features
- ✅ Fair random number generator using HMAC with SHA3-256
- ✅ Dice selection** by both user and computer
- ✅ Probability table (Help Mode) for all dice combinations
- ✅ Complete game flow and result declaration
- ✅ Robust error handling for invalid inputs or configurations

---

### ▶️ How to Run the Game

```bash
node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3


⚠️ Error Handling Demonstration

The program gracefully handles:
	•	❌ Missing dice
	•	❌ Less than three dice
	•	❌ Invalid face values (e.g., letters or decimals)
	•	❌ Invalid input selection during gameplay

At any selection stage, type ? to display a probability matrix of winning chances for each die combination.
