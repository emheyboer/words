function countChars(str) {
    var charcounts = Array(26).fill(0);
    for (let i = 0; i < str.length; i++) {
      charcounts[str.charCodeAt(i) - 97] += 1;
    }
    return charcounts;
}

function addCounts(c1, c2) {
  for (let i = 0; i < 26; i++) {
    c1[i] += c2[i];
  }
  return c1;
}

function addBuckets(pos1, pos2) {
  for (let i = 0; i < 26; i++) {
    pos1[i] = pos1[i] | pos2[i];
  }
  return pos1;
}

function normalize(word) {
  return word.toLowerCase().replace(/[^a-z]/g, '')
}

function isInt(n) {
  return n == Math.floor(n);
}

function processWords(words) {
  console.time('processing');
  words = words.map(function(text) {
    return {
      text: text,
      charcounts: countChars(text),
      positions: bucketize(text),
    }
  });
  console.timeEnd('processing');
  return words;
}

// for each letter in the word,
// treat the positions as though it were a binary number
// e.g. for the letter a
// abase => 10100 => reversed to 00101
// which equals 5
function bucketize(word) {
  var pos = Array(26).fill(0);
  for (let i = 0; i < word.length; i++) {
      let code = word.charCodeAt(i) - 97;
      if (0 <= code && code <= 25) {
        pos[code] += 2**i;
      }
  }
  return pos
}

function fetchWords(words) {
  return fetch('/words.txt')
    .then(r=>r.text()).then(function(words) {
      words = words.split('\n');
      localStorage.setItem('rawwords', words.join(','));
      return processWords(words);
    });
}


function displayWords(words) {
  var content = '';
  words.slice(0, 100).forEach(word => {
    content += word.text + '\n';
  })
  if (words.length > 100) {
    content += `+ ${words.length - 100} more`;
  }

  resultingWords.innerText = content;
}


const Filter = {
  Required: 'req',   // cumulative
  Disallowed: 'dis', // cumulative
  Pool: 'pol',       // replaced every time
  LengthEQ: 'leq',   // replaced every time
  LengthGT: 'lgt',   // replaced every time
  LengthLT: 'llt',   // replaced every time
  PositionedAt: 'pat',   // cumulative
  NotPositionedAt: 'nat', // cumulative
};


function readFilters(input) {
  var filters = {
    Required: Array(26).fill(0),
    Disallowed: Array(26).fill(0),
    Pool: Array(26).fill(1),
    LengthEQ: 0,
    LengthGT: 0,
    LengthLT: 0,
    PositionedAt: Array(26).fill(0),
    NotPositionedAt: Array(26).fill(0),
  };

  var lines = input.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let [fun, ...args] = lines[i].split(/\s+/);
    switch (fun) {
      case Filter.Required:
        filters.Required = addCounts(filters.Required,
          countChars(normalize(
            args.join('')
        )));
        break;
      case Filter.Disallowed:
        filters.Disallowed = addCounts(filters.Disallowed,
          countChars(normalize(
            args.join('')
        )));
        break;
      case Filter.Pool:
        filters.Pool = countChars(normalize(
            args.join('')
        ));
        break;
      case Filter.LengthEQ:
        filters.LengthEQ = Number(args[0]);
        break;
      case Filter.LengthGT:
        filters.LengthGT = Number(args[0]);
        break;
      case Filter.LengthLT:
        filters.LengthLT = Number(args[0]);
        break;
      case Filter.PositionedAt:
        filters.PositionedAt = addBuckets(filters.PositionedAt, bucketize(args.join('')));
        break;
      case Filter.NotPositionedAt:
        filters.NotPositionedAt = addBuckets(filters.NotPositionedAt, bucketize(args.join('')))
        break;
    }
  }

  return filters;
}


function filterWords(words, filters) {
  var matches = [];

  loop:
  for (let i = 0; i < words.length; i++) {
    let word = words[i];

    if (filters.LengthEQ && word.text.length != filters.LengthEQ) {
      continue loop;
    }
    if (filters.LengthGT && word.text.length <= filters.LengthGT) {
      continue loop;
    }
    if (filters.LengthLT && word.text.length >= filters.LengthLT) {
      continue loop;
    }

    let cc = word.charcounts;
    counts:
    for (let j = 0; j < 26; j++) {
      if (cc[j] < filters.Required[j]) {
        continue loop;
      }

      if (filters.Disallowed[j] && cc[j]) {
        continue loop;
      }

      if (!filters.Pool[j] && cc[j]) {
        continue loop;
      }

      if ((filters.PositionedAt[j] & word.positions[j]) != filters.PositionedAt[j]) {
        continue loop;
      }

      if (filters.NotPositionedAt[j] & word.positions[j]) {
        continue loop;
      }
    }

    matches.push(word);
  }

  return matches;
}


function main(words) {
  console.time('search');

  var filters = readFilters(filterinput.value);

  var matches = filterWords(words, filters);

  console.timeEnd('search');
  displayWords(matches);
}

window.onload = async function() {
  console.log('Starting...')
  filterinput.disabled = true;

  const rawwords = localStorage.getItem('rawwords');
  if (rawwords) {
    window.words = processWords(rawwords.split(','));
  } else {
    window.words = await fetchWords();
  }

  filterinput.disabled = false;

  filterinput.oninput = () => main(words);

  main(words);

  console.log('Done');
}
