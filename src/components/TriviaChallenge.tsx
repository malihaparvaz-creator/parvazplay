import { useState, useCallback } from 'react';
import { Sounds } from '../utils/useSounds';
import { usePersistedNumber } from '../utils/useBestScore';

interface Question {
  question: string;
  options: string[];
  correct: number;
  category: string;
}

const QUESTIONS: Question[] = [
  // 🪐 Space
  { question: "What planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1, category: "🪐 Space" },
  { question: "How many planets are in our solar system?", options: ["7", "8", "9", "10"], correct: 1, category: "🪐 Space" },
  { question: "What is the largest planet in our solar system?", options: ["Saturn", "Neptune", "Jupiter", "Uranus"], correct: 2, category: "🪐 Space" },
  { question: "Which planet is closest to the Sun?", options: ["Venus", "Earth", "Mercury", "Mars"], correct: 2, category: "🪐 Space" },
  { question: "What is the name of our galaxy?", options: ["Andromeda", "Milky Way", "Triangulum", "Sombrero"], correct: 1, category: "🪐 Space" },
  { question: "How long does it take light from the Sun to reach Earth?", options: ["8 seconds", "8 minutes", "8 hours", "8 days"], correct: 1, category: "🪐 Space" },
  { question: "Which planet has the most moons?", options: ["Jupiter", "Saturn", "Uranus", "Neptune"], correct: 1, category: "🪐 Space" },
  { question: "What is the hottest planet in our solar system?", options: ["Mercury", "Venus", "Mars", "Jupiter"], correct: 1, category: "🪐 Space" },
  { question: "What dwarf planet was reclassified from planet status in 2006?", options: ["Eris", "Pluto", "Ceres", "Haumea"], correct: 1, category: "🪐 Space" },
  { question: "Which moon in our solar system is the largest?", options: ["Titan", "Europa", "Ganymede", "Callisto"], correct: 2, category: "🪐 Space" },

  // 🦴 Science
  { question: "How many bones are in the adult human body?", options: ["186", "206", "226", "246"], correct: 1, category: "🦴 Science" },
  { question: "What is the largest organ in the human body?", options: ["Liver", "Brain", "Skin", "Lungs"], correct: 2, category: "🦴 Science" },
  { question: "How many chambers does the human heart have?", options: ["2", "3", "4", "5"], correct: 2, category: "🦴 Science" },
  { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi Body"], correct: 2, category: "🦴 Science" },
  { question: "What is the chemical formula for water?", options: ["H2O", "CO2", "NaCl", "O2"], correct: 0, category: "🦴 Science" },
  { question: "What gas do plants absorb from the atmosphere?", options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correct: 2, category: "🦴 Science" },
  { question: "What is the smallest unit of matter?", options: ["Molecule", "Atom", "Cell", "Proton"], correct: 1, category: "🦴 Science" },
  { question: "How many teeth does an adult human have?", options: ["28", "30", "32", "34"], correct: 2, category: "🦴 Science" },
  { question: "What part of the brain controls balance?", options: ["Cerebrum", "Cerebellum", "Medulla", "Hypothalamus"], correct: 1, category: "🦴 Science" },
  { question: "What blood type is the universal donor?", options: ["A+", "B-", "O-", "AB+"], correct: 2, category: "🦴 Science" },

  // 🌊 Geography
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3, category: "🌊 Geography" },
  { question: "Which country has the most people?", options: ["USA", "India", "China", "Indonesia"], correct: 1, category: "🌊 Geography" },
  { question: "What is the smallest country in the world?", options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1, category: "🌊 Geography" },
  { question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2, category: "🌊 Geography" },
  { question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Yangtze", "Mississippi"], correct: 1, category: "🌊 Geography" },
  { question: "Which continent is the Sahara Desert located on?", options: ["Asia", "South America", "Africa", "Australia"], correct: 2, category: "🌊 Geography" },
  { question: "What is the tallest mountain in the world?", options: ["K2", "Kangchenjunga", "Mount Everest", "Lhotse"], correct: 2, category: "🌊 Geography" },
  { question: "Which country has the most time zones?", options: ["Russia", "USA", "China", "France"], correct: 3, category: "🌊 Geography" },
  { question: "What is the largest desert in the world?", options: ["Sahara", "Gobi", "Antarctic", "Arabian"], correct: 2, category: "🌊 Geography" },
  { question: "Which river flows through London?", options: ["Seine", "Thames", "Danube", "Tiber"], correct: 1, category: "🌊 Geography" },
  { question: "What is the capital of Japan?", options: ["Osaka", "Kyoto", "Tokyo", "Yokohama"], correct: 2, category: "🌊 Geography" },
  { question: "Which country is shaped like a boot?", options: ["Spain", "Greece", "Italy", "Portugal"], correct: 2, category: "🌊 Geography" },
  { question: "What is the largest island in the world?", options: ["Australia", "Greenland", "New Guinea", "Borneo"], correct: 1, category: "🌊 Geography" },
  { question: "How many continents are there?", options: ["5", "6", "7", "8"], correct: 2, category: "🌊 Geography" },
  { question: "Which African country was formerly known as Abyssinia?", options: ["Somalia", "Ethiopia", "Eritrea", "Sudan"], correct: 1, category: "🌊 Geography" },

  // 🎨 Art
  { question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Monet"], correct: 2, category: "🎨 Art" },
  { question: "Who painted The Starry Night?", options: ["Monet", "Van Gogh", "Picasso", "Dali"], correct: 1, category: "🎨 Art" },
  { question: "In which museum is the Mona Lisa displayed?", options: ["The Met", "Uffizi", "Louvre", "Prado"], correct: 2, category: "🎨 Art" },
  { question: "Who painted the ceiling of the Sistine Chapel?", options: ["Raphael", "Michelangelo", "Donatello", "Botticelli"], correct: 1, category: "🎨 Art" },
  { question: "What art movement is Salvador Dali associated with?", options: ["Cubism", "Impressionism", "Surrealism", "Realism"], correct: 2, category: "🎨 Art" },
  { question: "Who is known as the 'Father of Impressionism'?", options: ["Monet", "Renoir", "Pissarro", "Degas"], correct: 0, category: "🎨 Art" },
  { question: "Which artist cut off his own ear?", options: ["Picasso", "Van Gogh", "Gauguin", "Matisse"], correct: 1, category: "🎨 Art" },
  { question: "What nationality was Pablo Picasso?", options: ["Italian", "French", "Spanish", "Portuguese"], correct: 2, category: "🎨 Art" },

  // 🧪 Chemistry
  { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2, category: "🧪 Chemistry" },
  { question: "What element does 'O' represent on the periodic table?", options: ["Osmium", "Oxygen", "Oganesson", "Olivine"], correct: 1, category: "🧪 Chemistry" },
  { question: "What is the chemical symbol for sodium?", options: ["So", "Sd", "Na", "N"], correct: 2, category: "🧪 Chemistry" },
  { question: "How many elements are on the periodic table (approx)?", options: ["98", "108", "118", "128"], correct: 2, category: "🧪 Chemistry" },
  { question: "What is the most abundant gas in Earth's atmosphere?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"], correct: 2, category: "🧪 Chemistry" },
  { question: "What is the pH of pure water?", options: ["5", "6", "7", "8"], correct: 2, category: "🧪 Chemistry" },
  { question: "Which element is a liquid metal at room temperature?", options: ["Iron", "Mercury", "Lead", "Tin"], correct: 1, category: "🧪 Chemistry" },
  { question: "What is the chemical symbol for iron?", options: ["Ir", "In", "Fe", "I"], correct: 2, category: "🧪 Chemistry" },
  { question: "What is table salt's chemical name?", options: ["Sodium Chloride", "Potassium Chloride", "Calcium Chloride", "Sodium Fluoride"], correct: 0, category: "🧪 Chemistry" },

  // 📜 History
  { question: "What year did the Titanic sink?", options: ["1905", "1912", "1920", "1898"], correct: 1, category: "📜 History" },
  { question: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2, category: "📜 History" },
  { question: "Who was the first President of the United States?", options: ["Adams", "Jefferson", "Washington", "Lincoln"], correct: 2, category: "📜 History" },
  { question: "The Great Wall of China was primarily built to defend against which group?", options: ["Japanese", "Mongolians", "Koreans", "Russians"], correct: 1, category: "📜 History" },
  { question: "In which year did the Berlin Wall fall?", options: ["1987", "1988", "1989", "1990"], correct: 2, category: "📜 History" },
  { question: "Who was the first human to travel to space?", options: ["Neil Armstrong", "Yuri Gagarin", "John Glenn", "Buzz Aldrin"], correct: 1, category: "📜 History" },
  { question: "The French Revolution began in which year?", options: ["1776", "1789", "1799", "1804"], correct: 1, category: "📜 History" },
  { question: "Which ancient civilization built the pyramids of Giza?", options: ["Romans", "Greeks", "Egyptians", "Persians"], correct: 2, category: "📜 History" },
  { question: "Who discovered America in 1492?", options: ["Vasco da Gama", "Ferdinand Magellan", "Christopher Columbus", "Amerigo Vespucci"], correct: 2, category: "📜 History" },
  { question: "The Roman Empire fell in which year?", options: ["376 AD", "410 AD", "476 AD", "527 AD"], correct: 2, category: "📜 History" },

  // 🔬 Science
  { question: "What is the speed of light approximately?", options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "100,000 km/s"], correct: 0, category: "🔬 Science" },
  { question: "What is the hardest natural substance?", options: ["Gold", "Iron", "Diamond", "Platinum"], correct: 2, category: "🔬 Science" },
  { question: "What force keeps us on the ground?", options: ["Magnetism", "Friction", "Gravity", "Inertia"], correct: 2, category: "🔬 Science" },
  { question: "What is the boiling point of water in Celsius?", options: ["90°C", "95°C", "100°C", "110°C"], correct: 2, category: "🔬 Science" },
  { question: "What scientist developed the theory of relativity?", options: ["Newton", "Einstein", "Hawking", "Bohr"], correct: 1, category: "🔬 Science" },
  { question: "What is the freezing point of water in Fahrenheit?", options: ["0°F", "32°F", "100°F", "212°F"], correct: 1, category: "🔬 Science" },
  { question: "What type of energy is stored in a battery?", options: ["Kinetic", "Thermal", "Chemical", "Nuclear"], correct: 2, category: "🔬 Science" },
  { question: "What does DNA stand for?", options: ["Deoxyribonucleic Acid", "Dinitric Acid", "Deoxyribose Acid", "Diribonucleic Acid"], correct: 0, category: "🔬 Science" },
  { question: "What is the most abundant element in the universe?", options: ["Oxygen", "Carbon", "Helium", "Hydrogen"], correct: 3, category: "🔬 Science" },
  { question: "Sound travels fastest through which medium?", options: ["Air", "Water", "Steel", "Vacuum"], correct: 2, category: "🔬 Science" },

  // 🦁 Animals
  { question: "Which animal is the tallest in the world?", options: ["Elephant", "Giraffe", "Horse", "Camel"], correct: 1, category: "🦁 Animals" },
  { question: "What is the fastest land animal?", options: ["Lion", "Cheetah", "Gazelle", "Horse"], correct: 1, category: "🦁 Animals" },
  { question: "How many legs does an octopus have?", options: ["6", "8", "10", "12"], correct: 1, category: "🦁 Animals" },
  { question: "What is the largest mammal in the world?", options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"], correct: 1, category: "🦁 Animals" },
  { question: "Which bird is known for its ability to mimic sounds?", options: ["Eagle", "Parrot", "Owl", "Crow"], correct: 1, category: "🦁 Animals" },
  { question: "How many hearts does an octopus have?", options: ["1", "2", "3", "4"], correct: 2, category: "🦁 Animals" },
  { question: "What is a group of lions called?", options: ["Herd", "Pack", "Pride", "Flock"], correct: 2, category: "🦁 Animals" },
  { question: "Which animal has the longest lifespan?", options: ["Elephant", "Tortoise", "Bowhead Whale", "Parrot"], correct: 2, category: "🦁 Animals" },
  { question: "What is the only mammal capable of true flight?", options: ["Flying Squirrel", "Bat", "Sugar Glider", "Colugo"], correct: 1, category: "🦁 Animals" },
  { question: "How many stomachs does a cow have?", options: ["1", "2", "3", "4"], correct: 3, category: "🦁 Animals" },

  // 🎵 Music
  { question: "How many strings does a standard guitar have?", options: ["4", "5", "6", "8"], correct: 2, category: "🎵 Music" },
  { question: "Who composed the 'Moonlight Sonata'?", options: ["Mozart", "Bach", "Beethoven", "Chopin"], correct: 2, category: "🎵 Music" },
  { question: "How many keys does a standard piano have?", options: ["76", "82", "88", "92"], correct: 2, category: "🎵 Music" },
  { question: "Which band sang 'Bohemian Rhapsody'?", options: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], correct: 1, category: "🎵 Music" },
  { question: "What instrument has 4 strings and is played with a bow?", options: ["Guitar", "Cello", "Violin", "Both B and C"], correct: 3, category: "🎵 Music" },
  { question: "Which genre of music originated in Jamaica?", options: ["Blues", "Reggae", "Jazz", "Salsa"], correct: 1, category: "🎵 Music" },
  { question: "Who is known as the 'King of Pop'?", options: ["Elvis Presley", "Michael Jackson", "Prince", "David Bowie"], correct: 1, category: "🎵 Music" },
  { question: "What does 'piano' mean in Italian?", options: ["Loud", "Soft", "Fast", "Slow"], correct: 1, category: "🎵 Music" },

  // 📚 Language
  { question: "Which language has the most native speakers?", options: ["English", "Spanish", "Mandarin", "Hindi"], correct: 2, category: "📚 Language" },
  { question: "How many letters are in the English alphabet?", options: ["24", "25", "26", "27"], correct: 2, category: "📚 Language" },
  { question: "What is the most widely spoken language in the world?", options: ["Mandarin", "English", "Spanish", "Hindi"], correct: 1, category: "📚 Language" },
  { question: "Which language is written from right to left?", options: ["Japanese", "Arabic", "Chinese", "Korean"], correct: 1, category: "📚 Language" },
  { question: "How many official languages does the UN have?", options: ["4", "5", "6", "7"], correct: 2, category: "📚 Language" },
  { question: "What language has the longest alphabet?", options: ["Russian", "Arabic", "Khmer", "Greek"], correct: 2, category: "📚 Language" },

  // 📜 Literature
  { question: "Who wrote Romeo and Juliet?", options: ["Dickens", "Shakespeare", "Austen", "Hemingway"], correct: 1, category: "📜 Literature" },
  { question: "Who wrote '1984'?", options: ["Huxley", "Orwell", "Bradbury", "Asimov"], correct: 1, category: "📜 Literature" },
  { question: "Who wrote 'Harry Potter'?", options: ["J.R.R. Tolkien", "J.K. Rowling", "C.S. Lewis", "Roald Dahl"], correct: 1, category: "📜 Literature" },
  { question: "Who wrote 'The Great Gatsby'?", options: ["Hemingway", "Steinbeck", "Fitzgerald", "Faulkner"], correct: 2, category: "📜 Literature" },
  { question: "Who wrote 'Pride and Prejudice'?", options: ["Brontë", "Austen", "Dickens", "Woolf"], correct: 1, category: "📜 Literature" },
  { question: "What is the first book of the Bible?", options: ["Exodus", "Genesis", "Leviticus", "Numbers"], correct: 1, category: "📜 Literature" },
  { question: "Who wrote 'The Lord of the Rings'?", options: ["C.S. Lewis", "J.R.R. Tolkien", "George R.R. Martin", "Terry Pratchett"], correct: 1, category: "📜 Literature" },

  // 🎬 Movies & TV
  { question: "What year was the first 'Star Wars' film released?", options: ["1975", "1977", "1979", "1980"], correct: 1, category: "🎬 Movies" },
  { question: "Who directed 'Jaws'?", options: ["George Lucas", "Steven Spielberg", "Martin Scorsese", "Francis Ford Coppola"], correct: 1, category: "🎬 Movies" },
  { question: "Which movie features the quote 'I'll be back'?", options: ["Robocop", "The Terminator", "Predator", "Die Hard"], correct: 1, category: "🎬 Movies" },
  { question: "What is the highest-grossing film of all time (as of 2023)?", options: ["Avengers: Endgame", "Avatar", "Titanic", "Star Wars: The Force Awakens"], correct: 1, category: "🎬 Movies" },
  { question: "In 'The Matrix', what color pill does Neo take?", options: ["Blue", "Red", "Green", "Yellow"], correct: 1, category: "🎬 Movies" },
  { question: "Who played the Joker in 'The Dark Knight' (2008)?", options: ["Jack Nicholson", "Jared Leto", "Joaquin Phoenix", "Heath Ledger"], correct: 3, category: "🎬 Movies" },
  { question: "Which animated film features a snowman named Olaf?", options: ["Moana", "Tangled", "Frozen", "Brave"], correct: 2, category: "🎬 Movies" },
  { question: "What is the name of the toy cowboy in 'Toy Story'?", options: ["Buzz", "Woody", "Rex", "Slinky"], correct: 1, category: "🎬 Movies" },

  // 🏅 Sports
  { question: "How many players are on a standard soccer team on the field?", options: ["9", "10", "11", "12"], correct: 2, category: "🏅 Sports" },
  { question: "In which sport is the term 'love' used for zero?", options: ["Badminton", "Tennis", "Squash", "Table Tennis"], correct: 1, category: "🏅 Sports" },
  { question: "How many rings are in the Olympic logo?", options: ["3", "4", "5", "6"], correct: 2, category: "🏅 Sports" },
  { question: "In which sport would you perform a 'slam dunk'?", options: ["Volleyball", "Tennis", "Basketball", "Baseball"], correct: 2, category: "🏅 Sports" },
  { question: "How many holes are in a standard round of golf?", options: ["9", "12", "18", "24"], correct: 2, category: "🏅 Sports" },
  { question: "Which country invented cricket?", options: ["Australia", "India", "England", "South Africa"], correct: 2, category: "🏅 Sports" },
  { question: "What is the maximum score in ten-pin bowling?", options: ["200", "250", "300", "350"], correct: 2, category: "🏅 Sports" },
  { question: "How long is a marathon in miles (approx)?", options: ["20.2", "24.2", "26.2", "28.2"], correct: 2, category: "🏅 Sports" },

  // 🍔 Food & Drink
  { question: "What country is the origin of the croissant?", options: ["France", "Italy", "Austria", "Switzerland"], correct: 2, category: "🍔 Food" },
  { question: "What is the main ingredient in guacamole?", options: ["Tomato", "Avocado", "Onion", "Pepper"], correct: 1, category: "🍔 Food" },
  { question: "Which fruit is known as the 'king of fruits'?", options: ["Mango", "Pineapple", "Durian", "Jackfruit"], correct: 2, category: "🍔 Food" },
  { question: "What type of pasta is shaped like a bow tie?", options: ["Penne", "Farfalle", "Fusilli", "Rigatoni"], correct: 1, category: "🍔 Food" },
  { question: "Sushi originated in which country?", options: ["China", "Korea", "Japan", "Thailand"], correct: 2, category: "🍔 Food" },
  { question: "What is the most expensive spice in the world?", options: ["Vanilla", "Saffron", "Cardamom", "Cinnamon"], correct: 1, category: "🍔 Food" },
  { question: "Which nut is used to make marzipan?", options: ["Cashew", "Pistachio", "Almond", "Walnut"], correct: 2, category: "🍔 Food" },
  { question: "What vitamin is produced when skin is exposed to sunlight?", options: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correct: 3, category: "🍔 Food" },

  // 💻 Technology
  { question: "Who co-founded Apple Inc.?", options: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg", "Jeff Bezos"], correct: 1, category: "💻 Technology" },
  { question: "What does 'HTTP' stand for?", options: ["HyperText Transfer Protocol", "High Tech Transfer Protocol", "HyperText Transmission Process", "High Transfer Text Protocol"], correct: 0, category: "💻 Technology" },
  { question: "In what year was the first iPhone released?", options: ["2005", "2006", "2007", "2008"], correct: 2, category: "💻 Technology" },
  { question: "What does 'CPU' stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], correct: 0, category: "💻 Technology" },
  { question: "Which company developed the Android operating system?", options: ["Apple", "Microsoft", "Google", "Samsung"], correct: 2, category: "💻 Technology" },
  { question: "What does 'Wi-Fi' stand for?", options: ["Wireless Fidelity", "Wide Frequency", "Wireless Function", "It's a brand name, not an acronym"], correct: 3, category: "💻 Technology" },
  { question: "Who is the CEO of Tesla?", options: ["Jeff Bezos", "Elon Musk", "Tim Cook", "Sundar Pichai"], correct: 1, category: "💻 Technology" },
  { question: "What programming language is known as the 'language of the web'?", options: ["Python", "Java", "JavaScript", "C++"], correct: 2, category: "💻 Technology" },
  { question: "What does 'RAM' stand for?", options: ["Read Access Memory", "Random Access Memory", "Rapid Access Memory", "Run Access Memory"], correct: 1, category: "💻 Technology" },
  { question: "Which company owns YouTube?", options: ["Apple", "Microsoft", "Google", "Meta"], correct: 2, category: "💻 Technology" },

  // 🎭 Mythology
  { question: "Who is the Greek god of the sea?", options: ["Zeus", "Poseidon", "Hades", "Ares"], correct: 1, category: "🎭 Mythology" },
  { question: "In Norse mythology, what is the name of the world tree?", options: ["Yggdrasil", "Mjolnir", "Valhalla", "Bifrost"], correct: 0, category: "🎭 Mythology" },
  { question: "Who is the Egyptian god of the dead?", options: ["Ra", "Horus", "Anubis", "Osiris"], correct: 3, category: "🎭 Mythology" },
  { question: "What creature has the body of a lion and the head of a human in Greek mythology?", options: ["Minotaur", "Sphinx", "Centaur", "Griffin"], correct: 1, category: "🎭 Mythology" },
  { question: "Who gave fire to humans in Greek mythology?", options: ["Hermes", "Prometheus", "Atlas", "Apollo"], correct: 1, category: "🎭 Mythology" },
  { question: "What is the name of Thor's hammer?", options: ["Mjolnir", "Gungnir", "Stormbreaker", "Aegis"], correct: 0, category: "🎭 Mythology" },

  // 🏛️ World Culture
  { question: "In which country would you find Machu Picchu?", options: ["Bolivia", "Peru", "Colombia", "Ecuador"], correct: 1, category: "🏛️ Culture" },
  { question: "What is the traditional Japanese art of paper folding?", options: ["Origami", "Ikebana", "Calligraphy", "Kintsugi"], correct: 0, category: "🏛️ Culture" },
  { question: "Which country is famous for the dance 'Flamenco'?", options: ["Portugal", "Italy", "Spain", "Greece"], correct: 2, category: "🏛️ Culture" },
  { question: "What is the currency of Japan?", options: ["Won", "Yuan", "Yen", "Ringgit"], correct: 2, category: "🏛️ Culture" },
  { question: "Which country invented paper?", options: ["Egypt", "India", "China", "Greece"], correct: 2, category: "🏛️ Culture" },
  { question: "What is the national flower of Japan?", options: ["Rose", "Cherry Blossom", "Lotus", "Sunflower"], correct: 1, category: "🏛️ Culture" },

  // 🎮 Gaming
  { question: "What year was the first Minecraft version released?", options: ["2007", "2009", "2011", "2013"], correct: 1, category: "🎮 Gaming" },
  { question: "Which company made the PlayStation?", options: ["Nintendo", "Microsoft", "Sony", "Sega"], correct: 2, category: "🎮 Gaming" },
  { question: "What is the best-selling video game of all time?", options: ["GTA V", "Minecraft", "Tetris", "Wii Sports"], correct: 1, category: "🎮 Gaming" },
  { question: "In which game would you find a character named 'Link'?", options: ["Mario", "Zelda", "Metroid", "Star Fox"], correct: 1, category: "🎮 Gaming" },
  { question: "What does 'RPG' stand for in gaming?", options: ["Rapid Play Game", "Role Playing Game", "Real Player Game", "Round Play Game"], correct: 1, category: "🎮 Gaming" },
  { question: "Which game popularized the 'battle royale' genre?", options: ["Fortnite", "PUBG", "Apex Legends", "Warzone"], correct: 1, category: "🎮 Gaming" },

  // 🧬 Nature
  { question: "What is the largest rainforest in the world?", options: ["Congo", "Amazon", "Daintree", "Borneo"], correct: 1, category: "🧬 Nature" },
  { question: "How many legs does a spider have?", options: ["6", "8", "10", "12"], correct: 1, category: "🧬 Nature" },
  { question: "What is the fastest fish in the ocean?", options: ["Tuna", "Marlin", "Sailfish", "Swordfish"], correct: 2, category: "🧬 Nature" },
  { question: "What process do plants use to make food from sunlight?", options: ["Respiration", "Photosynthesis", "Fermentation", "Osmosis"], correct: 1, category: "🧬 Nature" },
  { question: "What is the largest species of shark?", options: ["Great White", "Hammerhead", "Whale Shark", "Tiger Shark"], correct: 2, category: "🧬 Nature" },
  { question: "How long do elephants typically live?", options: ["30-40 years", "50-70 years", "80-100 years", "100-120 years"], correct: 1, category: "🧬 Nature" },
];

export function TriviaChallenge() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'answered' | 'ended'>('idle');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = usePersistedNumber('trivia-best-streak', 0);
  const [questions, setQuestions] = useState<Question[]>([]);

  const startGame = useCallback(() => {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 15);
    setQuestions(shuffled);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setGameState('playing');
    setStreak(0); Sounds.answerWrong();
  }, []);

  const handleAnswer = (index: number) => {
    if (gameState !== 'playing') return;
    setSelectedAnswer(index);
    setGameState('answered');

    const isCorrect = index === questions[currentQuestion].correct;
    if (isCorrect) {
      setScore((s) => s + 10 + streak * 2);
      setStreak((s) => s + 1); Sounds.answerCorrect();
      if (streak + 1 > bestStreak) {
        setBestStreak(streak + 1);
      }
    } else {
      setStreak(0); Sounds.answerWrong();
    }
  };

  const nextQuestion = () => {
    if (currentQuestion + 1 >= questions.length) {
      setGameState('ended');
    } else {
      setCurrentQuestion((c) => c + 1);
      setSelectedAnswer(null);
      setGameState('playing');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4 text-center">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Score</div>
          <div className="text-2xl font-bold text-yellow-300">{score}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Streak</div>
          <div className="text-2xl font-bold text-orange-300">🔥 {streak}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
          <div className="text-xs text-purple-200 uppercase tracking-wider">Question</div>
          <div className="text-2xl font-bold text-white">{Math.min(currentQuestion + 1, questions.length)}/{questions.length}</div>
        </div>
        {bestStreak > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 border border-white/20">
            <div className="text-xs text-purple-200 uppercase tracking-wider">Best Streak</div>
            <div className="text-2xl font-bold text-red-300">🔥 {bestStreak}</div>
          </div>
        )}
      </div>

      {gameState !== 'idle' && gameState !== 'ended' && questions[currentQuestion] && (
        <div className="w-full max-w-lg">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-8 border border-white/20 mb-6 text-center">
            <div className="text-sm text-purple-300 mb-3">{questions[currentQuestion].category}</div>
            <div className="text-xl font-bold text-white leading-relaxed">
              {questions[currentQuestion].question}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {questions[currentQuestion].options.map((option, index) => {
              let btnClass = 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 text-white';
              if (gameState === 'answered') {
                if (index === questions[currentQuestion].correct) {
                  btnClass = 'bg-green-500/40 border-green-400 text-green-200 scale-[1.02]';
                } else if (index === selectedAnswer && index !== questions[currentQuestion].correct) {
                  btnClass = 'bg-red-500/40 border-red-400 text-red-200 scale-95';
                } else {
                  btnClass = 'bg-white/5 border-white/10 text-white/40';
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={gameState === 'answered'}
                  className={`w-full px-6 py-4 rounded-xl border-2 font-semibold text-left transition-all duration-200 
                    ${btnClass} ${gameState === 'playing' ? 'cursor-pointer active:scale-95' : ''}`}
                >
                  <span className="mr-3 text-purple-300 font-bold">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          {gameState === 'answered' && (
            <div className="mt-6 text-center">
              {selectedAnswer === questions[currentQuestion].correct ? (
                <div className="text-green-400 font-bold text-lg mb-4 animate-pulse">
                  ✅ Correct! +{10 + (streak - 1) * 2} points
                </div>
              ) : (
                <div className="text-red-400 font-bold text-lg mb-4">
                  ❌ Wrong! The answer was: {questions[currentQuestion].options[questions[currentQuestion].correct]}
                </div>
              )}
              <button
                onClick={nextQuestion}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl
                  hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30
                  active:scale-95"
              >
                {currentQuestion + 1 >= questions.length ? '🏁 See Results' : '➡️ Next Question'}
              </button>
            </div>
          )}
        </div>
      )}

      {gameState === 'idle' && (
        <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl px-8 py-12 border border-white/20">
          <div className="text-6xl mb-4">🧠</div>
          <div className="text-2xl font-bold text-white mb-2">Trivia Challenge</div>
          <div className="text-purple-200 mb-6">15 random questions from various categories. Build streaks for bonus points!</div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl
              hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30
              active:scale-95 text-lg"
          >
            🎮 Start Challenge
          </button>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="text-center">
          <div className="text-4xl mb-3">🏁</div>
          <div className="text-2xl font-bold text-white mb-4">Game Over!</div>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl
              hover:from-purple-600 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/30
              active:scale-95"
          >
            🔄 Play Again
          </button>
        </div>
      )}
    </div>
  );
}
