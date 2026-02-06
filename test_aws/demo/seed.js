const { db, initializeDatabase } = require('./config/database');

// Seed categories
const categories = [
  { name: 'Animals', description: 'Mammals and other land animals' },
  { name: 'Birds', description: 'Flying and flightless birds' }
];

// Seed creatures (animals and birds)
const creatures = [
  // Animals
  {
    name: 'African Lion',
    scientific_name: 'Panthera leo',
    category: 'Animals',
    description: 'The African lion is one of the most iconic animals in the world, known as the "King of the Jungle". Lions are the only cats that live in groups called prides. Male lions are distinguished by their impressive manes, which can vary in color from blonde to black.',
    habitat: 'African savannas, grasslands, open woodlands',
    diet: 'Carnivore - Zebras, wildebeest, buffalo, antelope',
    lifespan: '10-14 years in the wild',
    conservation_status: 'Vulnerable',
    image_url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800',
    fun_facts: 'A lion\'s roar can be heard from 5 miles away! Lions sleep up to 20 hours a day, and female lions do 90% of the hunting for their pride.'
  },
  {
    name: 'African Elephant',
    scientific_name: 'Loxodonta africana',
    category: 'Animals',
    description: 'The African elephant is the largest land animal on Earth. These magnificent creatures are known for their intelligence, complex social structures, and remarkable memory. They communicate using a variety of sounds, including infrasound that can travel for miles.',
    habitat: 'Sub-Saharan Africa - forests, savannas, deserts',
    diet: 'Herbivore - Grass, leaves, bark, fruit',
    lifespan: '60-70 years',
    conservation_status: 'Vulnerable',
    image_url: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800',
    fun_facts: 'Elephants are the only animals that can\'t jump! They have incredible memories and can recognize over 200 individuals. An elephant\'s trunk has over 40,000 muscles.'
  },
  {
    name: 'Giant Panda',
    scientific_name: 'Ailuropoda melanoleuca',
    category: 'Animals',
    description: 'The giant panda is a beloved bear native to China, famous for its distinctive black and white coloring. Despite being classified as carnivores, pandas primarily eat bamboo. They are symbols of wildlife conservation worldwide.',
    habitat: 'Mountain forests of central China',
    diet: 'Herbivore - 99% bamboo, occasionally small animals',
    lifespan: '20 years in the wild, 30 in captivity',
    conservation_status: 'Vulnerable',
    image_url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800',
    fun_facts: 'Pandas spend 12 hours a day eating bamboo! Despite their cuddly appearance, pandas have a bite force strong enough to crush bamboo stems. Baby pandas are only about 1/900th the size of their mothers at birth.'
  },
  {
    name: 'Red Fox',
    scientific_name: 'Vulpes vulpes',
    category: 'Animals',
    description: 'The red fox is the largest of the true foxes and one of the most widely distributed members of the order Carnivora. Known for their cunning and adaptability, red foxes have colonized habitats from Arctic tundra to suburban areas.',
    habitat: 'Forests, grasslands, mountains, deserts, urban areas',
    diet: 'Omnivore - Rodents, rabbits, birds, fruits, insects',
    lifespan: '2-5 years in the wild',
    conservation_status: 'Least Concern',
    image_url: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800',
    fun_facts: 'Red foxes can hear a mouse squeaking from 100 feet away! They use the Earth\'s magnetic field to hunt, and their tail, called a "brush," helps them balance and stay warm.'
  },
  {
    name: 'Gray Wolf',
    scientific_name: 'Canis lupus',
    category: 'Animals',
    description: 'The gray wolf is the largest wild member of the dog family. Wolves are highly social animals that live in packs with complex hierarchies. They are apex predators and keystone species that play crucial roles in maintaining healthy ecosystems.',
    habitat: 'Forests, tundra, grasslands, deserts, mountains',
    diet: 'Carnivore - Deer, elk, moose, smaller mammals',
    lifespan: '6-8 years in the wild',
    conservation_status: 'Least Concern',
    image_url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800',
    fun_facts: 'Wolves can run up to 40 mph in short bursts! They have been known to travel up to 30 miles in a single day. Wolf pups are born deaf and blind.'
  },
  {
    name: 'Bengal Tiger',
    scientific_name: 'Panthera tigris tigris',
    category: 'Animals',
    description: 'The Bengal tiger is the most numerous tiger subspecies and is found primarily in India. These majestic cats are solitary hunters known for their strength, stealth, and distinctive orange coat with black stripes.',
    habitat: 'Tropical forests, mangroves, grasslands of India',
    diet: 'Carnivore - Deer, wild boar, buffalo, monkeys',
    lifespan: '10-15 years in the wild',
    conservation_status: 'Endangered',
    image_url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800',
    fun_facts: 'No two tigers have the same stripe pattern - they\'re like fingerprints! Tigers are excellent swimmers and often cool off in pools and streams. A tiger\'s roar can be heard from 2 miles away.'
  },

  // Birds
  {
    name: 'Bald Eagle',
    scientific_name: 'Haliaeetus leucocephalus',
    category: 'Birds',
    description: 'The bald eagle is a bird of prey found in North America and is the national bird of the United States. Known for its distinctive white head and tail contrasting with its dark brown body, the bald eagle represents strength and freedom.',
    habitat: 'Near large bodies of open water across North America',
    diet: 'Carnivore - Fish, small mammals, birds',
    lifespan: '20-30 years in the wild',
    conservation_status: 'Least Concern',
    image_url: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800',
    fun_facts: 'Bald eagles can see fish swimming from a mile away! Their nests, called eyries, can weigh up to 2 tons. They can dive at speeds up to 100 mph to catch fish.'
  },
  {
    name: 'Peacock',
    scientific_name: 'Pavo cristatus',
    category: 'Birds',
    description: 'The Indian peacock is famous for its stunning iridescent tail feathers, which can spread into a magnificent fan display. Males use these colorful displays to attract mates. The peacock is the national bird of India.',
    habitat: 'Forests, farmland, villages of South Asia',
    diet: 'Omnivore - Seeds, insects, small reptiles, berries',
    lifespan: '15-20 years',
    conservation_status: 'Least Concern',
    image_url: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=800',
    fun_facts: 'A peacock\'s tail feathers can reach up to 6 feet long! The "eyes" on their feathers are called ocelli. Despite their size, peacocks can fly short distances.'
  },
  {
    name: 'Atlantic Puffin',
    scientific_name: 'Fratercula arctica',
    category: 'Birds',
    description: 'The Atlantic puffin is a charismatic seabird known for its colorful beak and clown-like appearance. These excellent swimmers spend most of their lives at sea, only coming to land to breed on coastal cliffs.',
    habitat: 'North Atlantic Ocean coasts and islands',
    diet: 'Carnivore - Small fish, especially sand eels',
    lifespan: '20-30 years',
    conservation_status: 'Vulnerable',
    image_url: 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=800',
    fun_facts: 'Puffins can carry up to 12 fish in their beaks at once! They use their wings to "fly" underwater. Puffin beaks are colorful only during breeding season - they fade in winter.'
  },
  {
    name: 'Snowy Owl',
    scientific_name: 'Bubo scandiacus',
    category: 'Birds',
    description: 'The snowy owl is a large, white owl native to the Arctic regions. Unlike most owls, snowy owls are diurnal, meaning they hunt during the day. Their white plumage provides excellent camouflage in their snowy habitat.',
    habitat: 'Arctic tundra of North America, Europe, Asia',
    diet: 'Carnivore - Lemmings, rabbits, birds, fish',
    lifespan: '10 years in the wild',
    conservation_status: 'Vulnerable',
    image_url: 'https://images.unsplash.com/photo-1579019163248-e7761241d85a?w=800',
    fun_facts: 'Snowy owls can eat over 1,600 lemmings per year! Males become whiter as they age. They can detect prey under thick snow using only their hearing.'
  },
  {
    name: 'Hummingbird',
    scientific_name: 'Trochilidae',
    category: 'Birds',
    description: 'Hummingbirds are the smallest birds in the world, known for their ability to hover in mid-air by rapidly flapping their wings. Their iridescent feathers and incredible agility make them a wonder of nature.',
    habitat: 'Americas - from Alaska to Tierra del Fuego',
    diet: 'Omnivore - Nectar, small insects, spiders',
    lifespan: '3-5 years',
    conservation_status: 'Varies by species',
    image_url: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800',
    fun_facts: 'Hummingbirds can fly backwards and upside down! Their wings beat up to 80 times per second. They have the highest metabolism of any animal and must eat every 10-15 minutes.'
  },
  {
    name: 'Flamingo',
    scientific_name: 'Phoenicopterus',
    category: 'Birds',
    description: 'Flamingos are famous for their pink feathers, long legs, and curved beaks. Their distinctive color comes from the carotenoid pigments in their diet. Flamingos are highly social birds that live in large colonies.',
    habitat: 'Lagoons, lakes, and mudflats in Africa, Americas, Europe, Asia',
    diet: 'Omnivore - Algae, small crustaceans, brine shrimp',
    lifespan: '20-30 years in the wild',
    conservation_status: 'Least Concern',
    image_url: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=800',
    fun_facts: 'Flamingos are born gray or white and turn pink over time! They can only eat with their heads upside down. A group of flamingos is called a "flamboyance."'
  }
];

async function seed() {
  console.log('Starting database seeding...');

  // Initialize database
  await initializeDatabase();

  // Clear existing data (in correct order due to foreign keys)
  await db.run('DELETE FROM feedback');
  await db.run('DELETE FROM creatures');
  await db.run('DELETE FROM categories');

  // Insert categories
  const categoryIds = {};

  for (const cat of categories) {
    const result = await db.pool.query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
      [cat.name, cat.description]
    );
    categoryIds[cat.name] = result.rows[0].id;
    console.log(`Added category: ${cat.name}`);
  }

  // Insert creatures
  for (const creature of creatures) {
    await db.pool.query(
      `INSERT INTO creatures (name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        creature.name,
        creature.scientific_name,
        categoryIds[creature.category],
        creature.description,
        creature.habitat,
        creature.diet,
        creature.lifespan,
        creature.conservation_status,
        creature.image_url,
        creature.fun_facts
      ]
    );
    console.log(`Added creature: ${creature.name}`);
  }

  console.log('\nDatabase seeding completed!');
  console.log(`Added ${categories.length} categories`);
  console.log(`Added ${creatures.length} creatures`);

  // Close pool
  await db.pool.end();
  process.exit(0);
}

seed().catch(error => {
  console.error('Seeding error:', error);
  process.exit(1);
});
