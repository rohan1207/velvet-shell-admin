import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Cleaned catalog: needs_review omitted; ==C7 → LFJG0016B from image folder. */
const products = [
  {
    product_id: 'BRC-001',
    name: 'Silver Pearl Open Cuff Bracelet',
    material: 'Alloy',
    design: 'Pearl',
    type: 'Open Cuff Bracelet',
    style: 'Minimal & Elegant',
    description:
      'A delicate open-cuff bracelet featuring lustrous silver-toned detailing and pearl accents. Its minimal, elegant design makes it easy to style for everyday looks or dressier occasions. A thoughtful choice for gifting, it adds a subtle touch of sophistication to any jewellery collection.',
    variants: [
      { sku: 'YWJE0015', color: 'Silver', qty: 4, price_inr: 1599, image_folder: 'YWJE0015' },
    ],
  },
  {
    product_id: 'BRC-002',
    name: 'Vintage Silver Dolphin Zircon Chain Bracelet',
    material: 'Silver',
    design: 'Decorative Dolphin Links with Stone Detailing',
    type: 'Chain Bracelet',
    stone: 'Zircon',
    description:
      'A delicate silver chain bracelet featuring decorative dolphin-inspired links accented with sparkling stones. Its playful yet elegant design makes it a versatile addition to both everyday and occasion wear, and a thoughtful choice for gifting.',
    variants: [
      { sku: 'YWJE0016', color: 'White Stone', price_inr: 1299, image_folder: 'YWJE0016' },
      { sku: 'YWJE0017', color: 'Purple Stone', price_inr: 1299, image_folder: 'YWJE0017' },
    ],
  },
  {
    product_id: 'BRC-003',
    name: 'Clover Geometric Square Open Bracelet',
    material: 'Sterling Silver',
    design: 'Clover Geometric Square',
    type: 'Open Bracelet',
    description:
      'A refined open bracelet crafted in sterling silver, featuring a distinctive geometric square charm with subtle clover-inspired detailing. Its clean, vintage-inspired design adds an understated touch of elegance, making it versatile for everyday wear or special occasions.',
    variants: [
      { sku: 'YWJE0020', color: 'Silver', price_inr: 1199, image_folder: 'YWJE0020' },
    ],
  },
  {
    product_id: 'BRC-004',
    name: '925 Sterling Silver Double Star Bracelet',
    material: '925 Sterling Silver',
    design: 'Star',
    type: 'Chain & Link Bracelet',
    description:
      'A feminine 925 sterling silver bracelet featuring a fine chain and subtle star-shaped detailing. Its understated design makes it easy to wear on its own or pair with other bracelets for a layered look.',
    variants: [
      { sku: 'YWJE0030', color: 'Silver', length: '20 cm', price_inr: 1699, image_folder: 'YWJE0030' },
    ],
  },
  {
    product_id: 'BRC-005',
    name: '925 Sterling Silver Flower Bracelet',
    material: '925 Sterling Silver',
    design: 'Flower',
    type: 'Chain & Link Bracelet',
    description:
      'A sophisticated 925 sterling silver chain bracelet featuring a charming flower detail. Designed for effortless everyday elegance, it can also add a subtle feminine touch to festive and special-occasion looks.',
    variants: [
      { sku: 'YWJE0031', color: 'Silver', length: '20 cm', price_inr: 1699, image_folder: 'YWJE0031' },
    ],
  },
  {
    product_id: 'BRC-006',
    name: '925 Sterling Silver Feather Crystal Bracelet',
    material: '925 Sterling Silver',
    design: 'Feather',
    type: 'Crystal Bracelet',
    finish: 'Rhodium Plated',
    stone: 'Strawberry Crystal',
    description:
      'An elegant 925 sterling silver bracelet featuring an elegant feather-inspired design accented with a subtle strawberry crystal detail. Its lightweight, graceful silhouette makes it a versatile choice for everyday wear, parties and gifting.',
    variants: [
      { sku: 'YWJE0032', color: 'Silver', length: '20 cm', price_inr: 1699, image_folder: 'YWJE0032' },
    ],
  },
  {
    product_id: 'BRC-007',
    name: '925 Sterling Silver Daisy Flower Bracelet',
    material: '925 Sterling Silver',
    design: 'Daisy Flower',
    type: 'Chain Bracelet',
    description:
      'A minimal 925 sterling silver chain bracelet featuring a charming daisy flower accent. Its simple and feminine design makes it perfect for everyday styling and easy to pair with other jewellery.',
    variants: [
      { sku: 'YWJE0033', color: 'Silver', price_inr: 1699, image_folder: 'YWJE0033' },
    ],
  },
  {
    product_id: 'BRC-008',
    name: '925 Sterling Silver Feather Bracelet',
    material: '925 Sterling Silver',
    design: 'Feather',
    type: 'Chain Bracelet',
    finish: 'Rhodium Plated',
    description:
      'A graceful 925 sterling silver feather bracelet designed with a delicate chain and nature-inspired feather detailing. Its understated design makes it an elegant choice for everyday wear, festive occasions and thoughtful gifting.',
    variants: [
      { sku: 'YWJE0034', color: 'Gold', length: '20 cm', price_inr: 1699, image_folder: 'YWJE0034' },
      { sku: 'YWJE0035', color: 'Silver', length: '20 cm', price_inr: 1699, image_folder: 'YWJE0035' },
    ],
  },
  {
    product_id: 'BRC-009',
    name: '925 Sterling Silver Bird Branch Open Bracelet',
    material: '925 Sterling Silver',
    design: 'Bird & Branches',
    type: 'Open Bracelet',
    description:
      'Inspired by nature, this 925 sterling silver open bracelet features charming bird and branch detailing. Its airy design brings a graceful, whimsical touch to the wrist and pairs easily with everyday or occasion looks.',
    variants: [
      { sku: 'YWJE0047', color: 'Silver', length: '20.5 cm', price_inr: 1699, image_folder: 'YWJE0047' },
    ],
  },
  {
    product_id: 'BRC-010',
    name: 'Puppy Bracelet',
    material: '925 Sterling Silver',
    design: 'Puppy',
    type: 'Chain & Link Bracelet',
    description:
      'A playful take on everyday jewellery, this 925 sterling silver bracelet features a charming puppy-inspired design. Its simple silhouette makes it a fun choice for animal lovers and a thoughtful gift for someone special.',
    variants: [
      { sku: 'YWJE0048', color: 'Silver', length: '20.5 cm', price_inr: 1699, image_folder: 'YWJE0048' },
    ],
  },
  {
    product_id: 'BRC-011',
    name: 'Clover Open Bracelet',
    material: '925 Sterling Silver',
    design: 'Clover',
    type: 'Open Bracelet',
    description:
      'A symbol of good fortune, this 925 sterling silver open bracelet features a refined clover-inspired centrepiece. Its clean design makes it an effortless addition to everyday jewellery and an easy piece to layer with other bracelets.',
    variants: [
      { sku: 'YWJE0049', color: 'Silver', length: '20.5 cm', price_inr: 1699, image_folder: 'YWJE0049' },
    ],
  },
  {
    product_id: 'BRC-012',
    name: 'Daisy Flower Open Bracelet',
    material: '925 Sterling Silver',
    design: 'Daisy Flower',
    type: 'Open Bracelet',
    description:
      'Bring a touch of nature to your jewellery collection with this 925 sterling silver open bracelet, featuring multiple daisy flower accents. The floral arrangement adds a fresh and feminine character, making it suitable for everyday and festive styling.',
    variants: [
      { sku: 'YWJE0050', color: 'Silver', length: '20.5 cm', price_inr: 1699, image_folder: 'YWJE0050' },
    ],
  },
  {
    product_id: 'BRC-013',
    name: 'Red Heart Bracelet',
    material: '925 Sterling Silver',
    design: 'Heart Shaped',
    type: 'Chain & Link Bracelet',
    description:
      'A classic symbol of affection meets a modern chain design in this 925 sterling silver bracelet, finished with a vibrant red heart accent. It makes a meaningful everyday accessory and a lovely choice for gifting.',
    variants: [
      { sku: 'YWJE0051', color: 'Silver', length: '20.5 cm', price_inr: 1699, image_folder: 'YWJE0051' },
    ],
  },
  {
    product_id: 'BRC-014',
    name: 'Leaf Open Bracelet',
    material: '925 Sterling Silver',
    design: 'Leaf',
    type: 'Open Bracelet',
    description:
      'A modern 925 sterling silver open bracelet featuring a sleek silhouette accented with leaf-inspired detailing. Its clean design makes it easy to style on its own or pair with other bracelets for a layered look.',
    variants: [
      { sku: 'YWJE0053', color: 'Silver', length: '20.5 cm', price_inr: 1699, image_folder: 'YWJE0053' },
    ],
  },
  {
    product_id: 'BRC-015',
    name: 'Bamboo Knot Bracelet',
    material: '925 Sterling Silver',
    design: 'Bamboo Knot',
    type: 'Chain & Link Bracelet',
    description:
      'A nature-inspired 925 sterling silver chain bracelet featuring bamboo knot detailing and a simple, organic silhouette. Its understated design makes it a versatile addition to everyday jewellery and an elegant gifting option.',
    variants: [
      { sku: 'YWJE0056', color: 'Silver', price_inr: 1699, image_folder: 'YWJE0056' },
    ],
  },
  {
    product_id: 'BRC-016',
    name: 'Bamboo Joint Bracelet',
    material: '925 Sterling Silver',
    design: 'Bamboo Joint',
    type: 'Chain & Link Bracelet',
    description:
      'A contemporary bracelet inspired by the natural structure of bamboo, crafted in 925 sterling silver with distinctive bamboo-joint detailing. The fine chain gives it a refined finish that works beautifully on its own or as part of a layered look.',
    variants: [
      { sku: 'YWJE0058', color: 'Silver', price_inr: 1699, image_folder: 'YWJE0058' },
    ],
  },
  {
    product_id: 'BRC-017',
    name: 'Beaded Pearl Bracelet',
    material: '925 Sterling Silver',
    design: 'Double Pearl',
    type: 'Chain & Link Bracelet',
    stone: 'Pearl',
    description:
      'A refined 925 sterling silver bracelet featuring a continuous arrangement of pearl-toned beads along a fine chain. Its classic silhouette adds a sophisticated touch to everyday styling and transitions easily into occasion wear.',
    variants: [
      { sku: 'YWJE0059', color: 'Silver', price_inr: 1699, image_folder: 'YWJE0059' },
    ],
  },
  {
    product_id: 'BRC-018',
    name: 'Pearl Bracelet',
    material: '925 Sterling Silver',
    design: 'Pearl',
    type: 'Chain & Link Bracelet',
    stone: 'Pearl',
    description:
      'A timeless bracelet featuring pearls set along a 925 sterling silver chain, creating an elegant balance of shine and softness. Available with different pearl tones, it is an easy-to-style piece for everyday occasions, festive looks or thoughtful gifting.',
    variants: [
      {
        sku: 'YWJE0060',
        color: 'Silver with White Pearl',
        price_inr: 1699,
        image_folder: 'YWJE0060',
      },
      {
        sku: 'YWJE0061',
        color: 'Silver with Grey Pearl',
        price_inr: 1699,
        image_folder: 'YWJE0061',
      },
    ],
  },
  {
    product_id: 'BRC-019',
    name: 'Glitter Pearl Bracelet',
    material: '925 Sterling Silver',
    design: 'Glitter Pearl',
    type: 'Chain & Link Bracelet',
    stone: 'Pearl',
    description:
      'A refined chain and link bracelet featuring lustrous pearl accents with a subtle glittering finish. Its simple silhouette brings a touch of elegance to everyday looks and pairs beautifully with both casual and occasion wear.',
    variants: [
      { sku: 'YWJE0071', color: 'Silver', price_inr: 2999, image_folder: 'YWJE0071' },
      { sku: 'YWJE0072', color: 'Gold', price_inr: 2999, image_folder: 'YWJE0072' },
    ],
  },
  {
    product_id: 'BRC-020',
    name: 'Broken Bow Bracelet',
    material: '925 Sterling Silver',
    design: 'Broken Bow',
    type: 'Chain & Link Bracelet',
    description:
      'A distinctive 925 sterling silver bracelet featuring a broken-bow-inspired design along a fine chain. Its contemporary detailing adds character while keeping the overall look elegant and versatile.',
    variants: [
      { sku: 'YWJE0078', color: 'Silver', price_inr: 5999, image_folder: 'YWJE0078' },
    ],
  },
  {
    product_id: 'BRC-021',
    name: 'Zircon Princess-Cut Bracelet',
    material: '925 Sterling Silver',
    design: 'Zircon Princess Cut',
    type: 'Chain & Link Bracelet',
    stone: 'Zircon',
    description:
      'Add a subtle touch of colour to your look with this 925 sterling silver chain bracelet, featuring a princess-cut zircon accent at the centre. Its fine chain and refined stone detailing make it suitable for everyday wear as well as special occasions.',
    variants: [
      { sku: 'YWJE0079', color: 'Silver', price_inr: 1699, image_folder: 'YWJE0079' },
      { sku: 'YWJE0080', color: 'Rose Gold', price_inr: 1699, image_folder: 'YWJE0080' },
    ],
  },
  {
    product_id: 'BRC-022',
    name: 'Leaf Bangle',
    material: '925 Sterling Silver',
    design: 'Leaf',
    type: 'Open Bangle Bracelet',
    description:
      'Inspired by nature, this 925 sterling silver open bangle features graceful leaf-shaped accents along a sleek, minimal silhouette. Its contemporary design makes it easy to style with everyday outfits or layer with other bracelets.',
    variants: [
      { sku: 'YWJE0081', color: 'Silver', price_inr: 1699, image_folder: 'YWJE0081' },
    ],
  },
  {
    product_id: 'BRC-023',
    name: 'Forget-Me-Not Flower Bangle',
    material: '925 Sterling Silver',
    design: 'Forget-Me-Not Flower',
    type: 'Bangle',
    finish: '18K Gold Plated',
    description:
      'Delicate forget-me-not flowers adorn this elegant open bangle, creating a graceful botanical design with a refined finish. Crafted in 925 sterling silver with an 18K gold-plated finish, the slender silhouette makes it easy to style with both everyday and occasion looks.',
    variants: [
      {
        sku: 'LFJH0020E',
        color: 'Silver',
        finish: '18K Gold Plated',
        qty: 1,
        price_inr: 7999,
        image_folder: 'LFJH0020E',
      },
    ],
  },
  {
    product_id: 'BRC-024',
    name: 'Forget-Me-Not Flower Trail Bangle',
    material: '925 Sterling Silver',
    design: 'Forget-Me-Not Flower',
    type: 'Bangle',
    finish: '18K Gold Plated',
    description:
      'A graceful open bangle featuring a trail of delicate forget-me-not blooms along one side. Crafted in 925 sterling silver with an 18K gold-plated finish, the floral arrangement adds a soft, elegant touch while the open silhouette keeps the design light and easy to wear.',
    variants: [
      {
        sku: 'LFJH0021E',
        color: 'Silver',
        finish: '18K Gold Plated',
        qty: 1,
        price_inr: 7999,
        image_folder: 'LFJH0021E',
      },
    ],
  },
  {
    product_id: 'BRC-025',
    name: 'Lotus Whisper Bracelet',
    material: '925 Sterling Silver',
    design: 'Lotus Whisper',
    type: 'Open Bracelet',
    description:
      'A delicate open bracelet featuring a tiny lotus-inspired floral detail paired with a soft heart-shaped accent. Crafted in 925 sterling silver, its minimal silhouette and subtle botanical detailing create an elegant piece that is easy to wear every day.',
    variants: [
      {
        sku: 'LFJH0008B',
        color: 'Silver with Pink Accent',
        qty: 1,
        price_inr: 7999,
        image_folder: 'LFJH0008B',
      },
      {
        sku: 'LFJH0008A',
        color: 'Silver with Green Accent',
        qty: 1,
        price_inr: 7999,
        image_folder: 'LFJH0008A',
      },
    ],
  },
  {
    product_id: 'BRC-026',
    name: 'Floral Circle Bracelet',
    material: '925 Sterling Silver',
    design: 'Floral & Leaf',
    type: 'Bracelet',
    finish: '18K Gold Plated',
    description:
      'A fine circular bracelet detailed with a delicate flower and curved leaf accents. The slim chain and graceful floral arrangement create a refined, feminine look, while the 925 sterling silver construction with an 18K gold-plated finish adds a subtle touch of warmth.',
    variants: [
      {
        sku: 'LFJG0011B',
        color: 'Silver with Pink Accent',
        finish: '18K Gold Plated',
        qty: 1,
        price_inr: 4999,
        image_folder: 'LFJG0011B',
      },
      {
        sku: 'LFJG0011A',
        color: 'Silver with White Accent',
        finish: '18K Gold Plated',
        qty: 1,
        price_inr: 4999,
        image_folder: 'LFJG0011A',
      },
    ],
  },
  {
    product_id: 'BRC-027',
    name: 'Floral Stone Bracelet',
    material: '925 Sterling Silver',
    design: 'Floral Stone',
    type: 'Bracelet',
    stone: 'Coloured Stone',
    description:
      'A delicate 925 sterling silver bracelet featuring a smooth round stone accented with a detailed floral motif at the centre. The fine silver chain keeps the design lightweight and elegant, while the coloured stone adds a subtle pop of character.',
    variants: [
      {
        sku: 'LFJG0016B',
        color: 'Silver with Pink Stone Accent',
        qty: 1,
        price_inr: 5999,
        image_folder: 'LFJG0016B',
      },
      {
        sku: 'LFJG0016A',
        color: 'Silver with Green Stone Accent',
        qty: 1,
        price_inr: 5999,
        image_folder: 'LFJG0016A',
      },
    ],
  },
];

const out = join(root, 'docs', 'bracelets-final.json');
writeFileSync(out, JSON.stringify({ currency: 'INR', products }, null, 2));
console.log('wrote', out, '·', products.length, 'products');
