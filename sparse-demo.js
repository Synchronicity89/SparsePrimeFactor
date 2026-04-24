// sparse-demo.js
// Human-readable demo of sparse prime-exponent representation
// Supports numbers up to ~2^60 using BigInt

// Small list of primes for demo (we use these as our "known" primes)
const smallPrimes = [
    2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n,
    53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n
];

// Mock cheat table: largest primes under 2^60 (simplified)
const cheatTable = [
    1152921504606846883n, // example huge prime near 2^60
    1152921504606846799n,
    1152921504606846733n,
    1152921504606846673n,
    1152921504606846619n,
    1152921504606846583n,
    1152921504606846529n,
    1152921504606846493n
];

let currentRep1 = null;
let currentRep2 = null;

// Add a factor to the sparse list, or increase its exponent if it is already present.
function addFactor(factors, prime, exp, cheatIndex) {
    const existing = factors.find((factor) => factor.prime === prime);

    if (existing) {
        existing.exp += exp;
        return;
    }

    const factor = { prime: prime, exp: exp };
    if (cheatIndex !== undefined) {
        factor.cheatIndex = cheatIndex;
    }
    factors.push(factor);
}

// Continue trial division until the remaining value is prime.
// This is slower than a sophisticated factorization algorithm, but it is easy to read
// and it guarantees a full prime factorization for the demo.
function factorRemainingByTrialDivision(n, factors) {
    let divisor = 101n;

    if (divisor % 2n === 0n) {
        divisor += 1n;
    }

    while (divisor * divisor <= n) {
        if (n % divisor === 0n) {
            let exp = 0;
            while (n % divisor === 0n) {
                n /= divisor;
                exp++;
            }
            addFactor(factors, divisor, exp);
        }
        divisor += 2n;
    }

    if (n > 1n) {
        const cheatIndex = cheatTable.findIndex((prime) => prime === n);
        addFactor(factors, n, 1, cheatIndex !== -1 ? cheatIndex : undefined);
    }
}

// Convert a BigInt to sparse representation: array of {prime: BigInt, exp: number}
function toSparse(n) {
    if (n === 0n) return [];
    const factors = [];
    
    // Trial divide by small primes
    for (let p of smallPrimes) {
        if (n % p === 0n) {
            let exp = 0;
            while (n % p === 0n) {
                n /= p;
                exp++;
            }
            addFactor(factors, p, exp);
        }
    }

    // If anything left, keep dividing until we know whether it is prime.
    // The old code treated every leftover value as prime, which was incorrect.
    if (n > 1n) {
        factorRemainingByTrialDivision(n, factors);
    }
    return factors;
}

// Pretty-print sparse rep
function formatSparse(rep) {
    if (rep.length === 0) return "0";
    return rep.map(f => {
        const p = f.prime.toString();
        if (f.exp === 1) return p;
        if (f.cheatIndex !== undefined) return `P_cheat[${f.cheatIndex}]`;
        return `${p}^${f.exp}`;
    }).join(" × ");
}

// Multiply two sparse representations (just add exponents)
function multiplySparse(a, b) {
    let result = [];
    for (let prime of a) {
        result.push({prime: prime.prime, exp: prime.exp});
    }
    for (let fb of b) {
        const existing = result.find(f => f.prime === fb.prime);
        if (existing) {
            existing.exp += fb.exp;
        } else {
            result.push({...fb});
        }
    }
    return result;
}

// Divide sparse A by sparse B (just subtract exponents)
function multiplySparse(a, b) {
    let result = [];
    for (let prime of a) {
        result.push({prime: prime.prime, exp: prime.exp});
    }
    for (let bp of b) {
        for (let i=0; i<result.length; i++) {
            if (result[i].prime == bp.prime) {
                result[i].exp -= bp.exp;
                if (result[i].exp == 0) {
                    result.splice(i, 1);
                    i --;
                }
            } else {
                result.push({prime: bp.prime, exp: bp.exp*-1});
            }
        } 
    }
    return result;
}

// Converts a sparse representation to BigInt (added by Ckandyckainz)
function sparseToBigInt(sparse) {
    let bigInt = 1n;
    for (let factor of sparse) {
        for (let i=0; i<factor.exp; i++) {
            bigInt *= factor.prime;
        }
    }
    return bigInt;
}

// Simple demo of addition (shows weakness)
// "Addition requires full factorization of the sum → expensive!"
function addSparse(a, b) {
    // Actually functional code added by Ckandyckainz:
    const sum = sparseToBigInt(a)+sparseToBigInt(b);
    return toSparse(sum);
}

// Main demo runner
function demoAll() {
    const n1 = BigInt(document.getElementById("num1").value);
    const n2 = BigInt(document.getElementById("num2").value);
    
    currentRep1 = toSparse(n1);
    currentRep2 = toSparse(n2);
    
    document.getElementById("rep1").textContent = 
        `${n1} = ${formatSparse(currentRep1)}`;
    
    document.getElementById("rep2").textContent = 
        `${n2} = ${formatSparse(currentRep2)}`;
}

// Multiply demo
function multiplyDemo() {
    if (!currentRep1 || !currentRep2) {
        alert("First run full demo with two numbers");
        return;
    }
    const productRep = multiplySparse(currentRep1, currentRep2);
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = `
        <strong>Multiplication:</strong> trivial vector addition<br>
        Result sparse: ${formatSparse(productRep)}
    `;
}

// Add demo
function addDemo() {
    const resultEl = document.getElementById("result");
    resultEl.innerHTML = `
        <strong>Addition attempt:</strong><br>
        ${formatSparse(addSparse(currentRep1 || [], currentRep2 || []))}
        <br><span class="error">This is the main weakness of the system.</span>
    `;
}

// Mock RL Guesser
function runRLGuesser() {
    const output = document.getElementById("rlOutput");
    output.textContent = "RL Agent thinking...\n";
    
    // Generate a random semiprime for demo
    const p1 = smallPrimes[Math.floor(Math.random() * smallPrimes.length)];
    const p2 = smallPrimes[Math.floor(Math.random() * smallPrimes.length)];
    const semiprime = p1 * p2;
    
    output.textContent += `Target number: ${semiprime}\n`;
    output.textContent += `Episode 1: Trying divisor  ${p1 + 1n}... miss\n`;
    output.textContent += `Episode 12: Trying divisor ${p1}... success!\n`;
    output.textContent += `Episode 15: Trying divisor ${p2}... success!\n`;
    output.textContent += `\n✅ RL Guesser found factors in ~15 trials (simulated)\n`;
    output.textContent += `Sparse rep: ${formatSparse(toSparse(semiprime))}`;
}

// Populate cheat table on load
function init() {
    let tableHTML = "Cheat Table (largest primes < 2^60):\n";
    cheatTable.forEach((p, i) => {
        tableHTML += `Index ${i}: ${p}\n`;
    });
    document.getElementById("cheatTable").textContent = tableHTML;
    
    // Run initial demo
    demoAll();
}

window.onload = init;
