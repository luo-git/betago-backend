const { getDanFromRating, getRatingDelta, getWinningProb } = require("./elo");

// Testing elo to dan/kyu conversion correctness (passed)
const testEloDan = () => {
  for (let i = 0; i < 3000; i += 100) {
    console.log(`Elo: ${i - 1}, Rank: ${getDanFromRating(i - 1)}`);
    console.log(`Elo: ${i}, Rank: ${getDanFromRating(i)}`);
    console.log(`Elo: ${i + 1}, Rank: ${getDanFromRating(i + 1)}`);
  }
};

// Test the correctness of calculating winning probability (passed)
const testWinningProb = () => {
  for (let rating = 100; rating < 3000; rating += 100) {
    for (let eloDiff = 0; eloDiff < 500; eloDiff += 25) {
      process.stdout.write(
        (getWinningProb(rating, rating + eloDiff) * 100).toFixed(1) + " "
      );
    }
    process.stdout.write("\n");
  }
};

// Test elo delta correctness (observed deviation from the actual delta
// of approx. 2. This is due to the approximation of K value.)
const testEloDelta = () => {
  for (let rating = 100; rating < 3000; rating += 100) {
    for (let eloDiff = 0; eloDiff < 500; eloDiff += 25) {
      process.stdout.write(getRatingDelta(rating, rating + eloDiff, 1) + " ");
    }
    process.stdout.write("\n");
  }
};

testEloDan();
testEloDelta();
testWinningProb();
