const crypto = require("crypto");
const readlineSync = require("readline-sync");
const Table = require("cli-table3");

class Dice {
  constructor(faces) {
    this.faces = faces;
  }

  getFaces() {
    return this.faces;
  }

  getFaceCount() {
    return this.faces.length;
  }

  toString() {
    return `[${this.faces.join(",")}]`;
  }
}

class DiceParser {
  static parseDice(args) {
    if (args.length < 3) {
      throw new Error(
        "At least 3 Dice are required. Example: node game.js 1,2,3 4,5,6 7,8,9"
      );
    }

    const dice = [];
    for (const arg of args) {
      const facesInString = arg.split(",");
      const faces = facesInString.map((face) => {
        const num = parseInt(face.trim());
        if (isNaN(num)) throw new Error("Invalid Die face: " + face);
        return num;
      });

      if (faces.length < 1)
        throw new Error("A die must have at least one face");

      dice.push(new Dice(faces));
    }
    return dice; //an array of objects (Dice instances) is returned -> [die1, die2, die3,]
  }
}

class FairRandomGenerator {
  constructor(rangeSize) {
    this.rangeSize = rangeSize;
    this.key = crypto.randomBytes(32);
    this.x = crypto.randomInt(0, this.rangeSize + 1);
    this.hmac = this.computeHMAC();
  }

  computeHMAC() {
    const hmac = crypto.createHmac("sha3-256", this.key);
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32BE(this.x);
    hmac.update(buffer);
    return hmac.digest("hex");
  }

  getHMAC() {
    return this.hmac;
  }

  computeResult(y) {
    return (this.x + y) % (this.rangeSize + 1);
  }

  getX() {
    return this.x;
  }

  getKey() {
    return this.key.toString("hex");
  }
}

class ProbabilityCalculator {
  static calculateWinProbability(die1, die2) {
    let die1Wins = 0;
    const totalFaces = die1.getFaceCount() * die2.getFaceCount();
    for (const eachDie1Face of die1.getFaces()) {
      for (const eachDie2Face of die2.getFaces()) {
        if (eachDie1Face > eachDie2Face) die1Wins++;
      }
    }
    return die1Wins / totalFaces;
  }

  static averageWinProbability(die, dice) {
    let total = 0;
    for (const eachDie of dice) {
      if (die === eachDie) continue;

      total = total + this.calculateWinProbability(die, eachDie);
    }

    return total / (dice.length - 1);
  }
}

class HelpTableDisplay {
  static tableDisplay(dice) {
    const headers = [
      "User Dice  Vs --> Dice",
      ...dice.map((die, i) => die.toString()),
    ];
    const table = new Table({ head: headers, style: { head: ["cyan"] } });

    for (let i = 0; i < dice.length; i++) {
      const row = [];

      row.push(dice[i].toString());
      for (let j = 0; j < dice.length; j++) {
        if (i === j) {
          const probability = ProbabilityCalculator.calculateWinProbability(
            dice[i],
            dice[j]
          );
          row.push(`- (${probability.toFixed(4)})`);
        } else {
          const prob = ProbabilityCalculator.calculateWinProbability(
            dice[i],
            dice[j]
          );
          row.push(prob.toFixed(4));
        }
      }
      table.push(row);
    }
    console.log("\nWin Probability for the User");
    console.log(table.toString());
  }
}

class Game {
  constructor(dice) {
    this.dice = dice;
    this.firstPlayer = null;
    this.userDie = null;
    this.computerDie = null;
  }

  start() {
    try {
      this.firstPlayer = this.DetermineFirstPlayer();
      this.selectDice();
      const { userRoll, computerRoll } = this.performThrows();
      this.declareWinner(userRoll, computerRoll);
    } catch (e) {
      console.error(`\nError: ${e.message}`);
      process.exit(1);
    }
  }

  DetermineFirstPlayer() {
    console.log("Finding out the firstPlayer...\n");
    const fairRandom = new FairRandomGenerator(1);
    console.log(
      `Computer selected a random value in the range (0...1). HMAC(${fairRandom.getHMAC()}).`
    );
    console.log("Try to guess its value");

    let userChoice;
    do {
      userChoice = readlineSync
        .question("0 - 0\n1 - 1\nX - Exit\n? = Help\nYour Selection: ")
        .toUpperCase();

      if (userChoice === "X") {
        console.log("Thanks for Playing the game!");
        process.exit(0);
      }
      if (userChoice === "?") {
        HelpTableDisplay.tableDisplay(this.dice);
        console.log("\nTry to guess Computer's selection (0 or 1)");
        continue;
      }

      if (!["0", "1"].includes(userChoice)) {
        console.log(
          "You must provide a valid option. Please, enter 0, 1, X, or ?"
        );
        continue;
      }

      break;
    } while (true);

    const userY = parseInt(userChoice);

    const result = fairRandom.computeResult(userY);
    console.log(
      `Computer's Number: ${fairRandom.getX()}.\n Key: ${fairRandom.getKey()}`
    );
    const computerChoice = fairRandom.getX();
    const userCorrect = userY === computerChoice;
    const firstPlayer = userCorrect ? "user" : "computer";

    console.log(
      `The result is ${userY} + ${computerChoice} = ${result} (mod 2)`
    );

    console.log(
      `\n${firstPlayer === "user" ? "You" : "Computer"} make the first move.\n`
    );
    return firstPlayer;
  }

  selectDice() {
    if (this.firstPlayer === "user") {
      this.userDie = this.promptUserDieSelection(
        "Choose your die:\n" +
          this.dice.map((d, i) => `${i} - ${d.toString()}`).join("\n") +
          "\nX - exit\n? - help\nYour selection: "
      );
      this.computerDie = this.selectComputerDie([this.userDie]);
    } else {
      this.computerDie = this.selectComputerDie();
      this.userDie = this.promptUserDieSelection(
        "Choose your dice:\n" +
          this.dice
            .filter((d) => d !== this.computerDie)
            .map((d, i) => `${i} - ${d.toString()}`)
            .join("\n") +
          "\nX - exit\n? - help\nYour selection: ",
        [this.computerDie]
      );
    }
    console.log(`You chose the ${this.userDie.toString()} die.\n`);
    console.log(`Computer chose the ${this.computerDie.toString()} die.\n`);
  }

  promptUserDieSelection(promptMessage, exclude = []) {
    const availableDice = this.dice.filter((die) => !exclude.includes(die));

    const options = availableDice.map((d, i) => i.toString());
    let userChoice;
    do {
      userChoice = readlineSync.question(promptMessage).toUpperCase();
      if (userChoice === "X") process.exit(0);
      if (userChoice === "?") {
        HelpTableDisplay.tableDisplay(this.dice);
        continue;
      }

      if (!options.includes(userChoice)) {
        console.log(
          `Invalid User choice. Please, provide one of the options: 0 - ${
            availableDice.length - 1
          }, X, or ?.`
        );
        continue;
      }

      break;
    } while (true);
    return availableDice[parseInt(userChoice, 10)];
  }

  selectComputerDie(exclude = []) {
    const availableDice = this.dice.filter((die) => !exclude.includes(die));

    if (availableDice.length === 0)
      throw new Error("No available dice to select");

    if (exclude.length === 0) {
      let bestDie = availableDice[0];
      let bestAvg = ProbabilityCalculator.averageWinProbability(
        bestDie,
        availableDice
      );

      for (const die of availableDice.slice(1)) {
        const avg = ProbabilityCalculator.averageWinProbability(
          die,
          availableDice
        );

        if (avg > bestAvg) {
          bestDie = die;
          bestAvg = avg;
        }
      }
      return bestDie;
    } else {
      let bestDie = availableDice[0];
      let bestWinProb = ProbabilityCalculator.calculateWinProbability(
        bestDie,
        exclude[0]
      );

      for (const die of availableDice.slice(1)) {
        const winProb = ProbabilityCalculator.calculateWinProbability(
          die,
          exclude[0]
        );

        if (winProb > bestWinProb) {
          bestDie = die;
          bestWinProb = winProb;
        }
      }
      return bestDie;
    }
  }

  performThrows() {
    console.log("It is time for me to make the throw\n");
    const computerRoll = this.performFairRoll(
      this.computerDie.getFaceCount() - 1
    );

    console.log(
      `Computer's throw is ${this.computerDie.getFaces()[computerRoll]}.\n`
    );

    console.log("It is time for you to make the throw\n");
    const userRoll = this.performFairRoll(this.userDie.getFaceCount() - 1);
    console.log(`Your throw is ${this.userDie.getFaces()[userRoll]}`);

    return {
      userRoll: this.userDie.getFaces()[userRoll],
      computerRoll: this.computerDie.getFaces()[computerRoll],
    };
  }

  performFairRoll(max) {
    const fairRandom = new FairRandomGenerator(max);

    console.log(
      `Computer selected a value in the range of 0...${max} (HMAC = ${fairRandom.getHMAC()})\n`
    );

    console.log("Add your number");

    const options = Array.from({ length: max + 1 }, (_, i) => i.toString());
    let userChoice;
    do {
      userChoice = readlineSync
        .question(
          options.map((_, i) => `${i} - ${i}`).join("\n") +
            "\nX - exit\n? - help\nYour selection: "
        )
        .toUpperCase();

      if (userChoice === "X") {
        console.log("Thanks for playing the game!");
        process.exit(0);
      }
      if (userChoice === "?") {
        HelpTableDisplay.tableDisplay(this.dice);
        continue;
      }
      if (!options.includes(userChoice)) {
        console.log(`Please, enter a valid value: 0 - ${max}, X, or ?.`);
        continue;
      }

      break;
    } while (true);

    const userY = parseInt(userChoice, 10);
    const result = fairRandom.computeResult(userY);

    console.log(
      `Computer's number is ${fairRandom.getX()}. Key is ${fairRandom.getKey()}`
    );
    console.log(
      `The result is ${userY} + ${fairRandom.getX()} = ${result} (mod ${
        max + 1
      }).`
    );
    return result;
  }

  declareWinner(userValue, computerValue) {
    if (userValue > computerValue) {
      console.log(`You win (${userValue} > ${computerValue})`);
    } else if (computerValue > userValue) {
      console.log(`I win (${computerValue} > ${userValue})`);
    } else {
      console.log(`It is draw (${userValue} = ${computerValue})`);
    }
  }
}

try {
  const args = process.argv.slice(2);
  if (args.length < 3)
    throw new Error(
      "Incorrect number of Dice. Please, provide at least three dice!"
    );
  const dice = DiceParser.parseDice(args);
  const game = new Game(dice);
  game.start();
} catch (e) {
  console.log(`Error: ${e.message}`);
  console.log(
    `Example usage: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3`
  );
  process.exit(1);
}
