import { findTerm, freeOfSegments, maskTerms, matchesTerm, normalize } from './text'

export type AllergenId =
  | 'sesame'
  | 'dairy'
  | 'gluten'
  | 'treenut'
  | 'peanut'
  | 'egg'
  | 'shellfish'
  | 'fish'
  | 'soy'

export type MatchKind = 'direct' | 'derivative' | 'cross-contact'

export interface AllergenMatch {
  allergen: AllergenId
  term: string
  kind: MatchKind
}

interface AllergenGroup {
  id: AllergenId
  label: { ar: string; en: string }
  /** The allergen named outright. */
  direct: readonly string[]
  /** Foods that carry it without naming it — where name matching normally fails. */
  derivative: readonly string[]
  /** Shared oil, shared fryer, shared board. Rejected too, explained differently. */
  crossContact: readonly string[]
  /** Phrases that clear this group even though a term above appears inside them. */
  exceptions: readonly string[]
}

export const ALLERGENS: readonly AllergenGroup[] = [
  {
    id: 'sesame',
    label: { ar: 'السمسم', en: 'Sesame' },
    direct: ['سمسم', 'sesame', 'زيت السمسم', 'sesame oil'],
    derivative: [
      'طحينه',
      'طحينية',
      'tahini',
      'tahina',
      'حلاوه طحينيه',
      'حلاوه',
      'halva',
      'حمص',
      'hummus',
      'بابا غنوج',
      'baba ghanoush',
      'دقه',
      'dukkah',
      "za'atar",
      'زعتر مخلوط',
      'خبز بالسمسم',
      'برجر',
      'burger bun',
      'صمون',
      'فلافل',
      'falafel',
      'حلاوه طحينيه بالفستق',
    ],
    crossContact: ['خبز عربي من مخبز', 'bakery bread'],
    exceptions: ['حمص حب', 'حمص مسلوق', 'boiled chickpeas', 'زعتر اخضر'],
  },
  {
    id: 'dairy',
    label: { ar: 'الحليب ومشتقاته', en: 'Milk & dairy' },
    direct: ['حليب', 'milk', 'لبن', 'dairy', 'البان'],
    derivative: [
      'زبادي',
      'روب',
      'yoghurt',
      'yogurt',
      'جبن',
      'جبنه',
      'cheese',
      'حلوم',
      'halloumi',
      'فيتا',
      'feta',
      'موزاريلا',
      'mozzarella',
      'زبده',
      'butter',
      'سمن',
      'ghee',
      'قشطه',
      'cream',
      'كريمه',
      'مصل اللبن',
      'whey',
      'كازين',
      'casein',
      'بروتين واي',
      'whey protein',
      'ايس كريم',
      'ice cream',
      'مهلبيه',
      'ارز بحليب',
      'رايته',
      'لبنه',
      'labneh',
      'ثريد',
      'بشاميل',
      'bechamel',
      'كيري',
      'قيمر',
      // Gulf sweets are built on ghee, cream or cheese even when the name says
      // neither. This block is why the map is data and not a set of ifs.
      'كنافه',
      'kunafa',
      'معمول',
      'مامول',
      'maamoul',
      'بقلاوه',
      'baklava',
      'ام علي',
      'عيش السرايا',
      'لقيمات',
      'كيك',
      'براوني',
      'شوكولاته بالحليب',
      'milk chocolate',
      'خنفروش',
    ],
    crossContact: [],
    /**
     * The whole reason this field exists: "حليب لوز" and "زبدة الفول السوداني"
     * both carry a dairy word and no dairy.
     */
    exceptions: [
      'حليب لوز',
      'almond milk',
      'حليب جوز الهند',
      'coconut milk',
      'حليب صويا',
      'soy milk',
      'حليب شوفان',
      'oat milk',
      'حليب ارز',
      'rice milk',
      'حليب كاجو',
      'cashew milk',
      'زبده الفول السوداني',
      'peanut butter',
      'زبده اللوز',
      'almond butter',
      'زبده الكاجو',
      'زبده جوز الهند',
      'جبن نباتي',
      'vegan cheese',
      'ايس كريم نباتي',
      'بروتين نباتي',
      'plant protein',
      'بروتين بازلاء',
      'pea protein',
      'زبده الطحينه',
    ],
  },
  {
    id: 'gluten',
    label: { ar: 'القمح والجلوتين', en: 'Wheat & gluten' },
    direct: ['قمح', 'wheat', 'جلوتين', 'gluten', 'شعير', 'barley', 'دقيق', 'flour', 'طحين'],
    derivative: [
      'برغل',
      'bulgur',
      'فريكه',
      'freekeh',
      'سميد',
      'semolina',
      'كسكس',
      'couscous',
      'معكرونه',
      'pasta',
      'مكرونه',
      'spaghetti',
      'نودلز',
      'noodles',
      'خبز',
      'bread',
      'صمون',
      'خبز رقاق',
      'خبز تنور',
      'چباتي',
      'chapati',
      'باراثا',
      'هريس',
      'harees',
      'جريش',
      'شوربه شعير',
      'شوربه الشعير',
      'كيك',
      'cake',
      'بسكوت',
      'biscuit',
      'كوكيز',
      'cookie',
      'معجنات',
      'pastry',
      'فطيره',
      'سمبوسه',
      'samosa',
      'لقيمات',
      'كنافه',
      'kunafa',
      'بقلاوه',
      'baklava',
      'برياني',
      'شوفان',
      'oats',
      'صويا صوص',
      'soy sauce',
      'بانكيك',
      'وافل',
      'تورتيلا',
      'tortilla',
      'رقاق',
      'برجر',
      'ساندويتش',
      'sandwich',
      'بيتزا',
      'pizza',
    ],
    crossContact: ['مقلي في نفس الزيت', 'shared fryer'],
    exceptions: [
      'شوفان خالي من الجلوتين',
      'gluten free oats',
      'خبز خالي من الجلوتين',
      'ارز',
      'رز',
      'خبز الارز',
      'معكرونه ارز',
      'rice noodles',
      'تورتيلا ذره',
      'corn tortilla',
      'دقيق ارز',
      'دقيق لوز',
      'almond flour',
      'دقيق حمص',
      'صويا صوص خالي من الجلوتين',
      'tamari',
      // Tahini is sesame paste, not flour. Masked here because Arabic suffix
      // rules otherwise let "طحين" reach "طحينة".
      'طحينه',
      'طحينيه',
      'tahini',
      'tahina',
    ],
  },
  {
    id: 'treenut',
    label: { ar: 'المكسرات', en: 'Tree nuts' },
    direct: [
      'مكسرات',
      'nuts',
      'لوز',
      'almond',
      'كاجو',
      'cashew',
      'جوز',
      'walnut',
      'فستق',
      'pistachio',
      'بندق',
      'hazelnut',
      'صنوبر',
      'pine nut',
      'بيكان',
      'pecan',
      'مكاديميا',
      'macadamia',
    ],
    derivative: [
      'نوتيلا',
      'nutella',
      'بيستو',
      'pesto',
      'حلى شرقي',
      'حلويات شرقيه',
      'بقلاوه',
      'baklava',
      'كنافه بالفستق',
      'مامول',
      'معمول',
      'ارز بالمكسرات',
      'ارز مزين باللوز',
      'ارز مزين بالصنوبر',
      'كبسه بالمكسرات',
      'مرصبان',
      'marzipan',
      'برالين',
      'praline',
      'حلاوه طحينيه بالفستق',
      'مويسلي',
      'muesli',
      'جرانولا',
      'granola',
      'دهن اللوز',
      'زبده اللوز',
      'almond butter',
      'حليب لوز',
      'almond milk',
      'دقيق لوز',
      'almond flour',
    ],
    crossContact: ['محمصه', 'nut roastery'],
    exceptions: ['جوز الهند', 'coconut', 'حليب جوز الهند', 'زيت جوز الهند', 'جوزه الطيب'],
  },
  {
    id: 'peanut',
    label: { ar: 'الفول السوداني', en: 'Peanut' },
    direct: ['فول سوداني', 'peanut', 'فستق عبيد'],
    derivative: [
      'زبده الفول السوداني',
      'peanut butter',
      'صوص ساتاي',
      'satay',
      'زيت الفول السوداني',
      'groundnut oil',
      'صوص تايلندي',
    ],
    crossContact: ['محمصه', 'nut roastery'],
    exceptions: ['فول مدمس', 'فول اخضر', 'فول ابيض', 'broad beans'],
  },
  {
    id: 'egg',
    label: { ar: 'البيض', en: 'Egg' },
    direct: ['بيض', 'egg', 'بيضه'],
    derivative: [
      'مايونيز',
      'mayonnaise',
      'mayo',
      'شكشوكه',
      'shakshuka',
      'عجه',
      'اومليت',
      'omelette',
      'معكرونه طازجه',
      'fresh pasta',
      'مرنق',
      'meringue',
      'كسترد',
      'custard',
      'كيك',
      'cake',
      'براوني',
      'brownie',
      'بانكيك',
      'pancake',
      'وافل',
      'waffle',
      'ايس كريم',
      'ice cream',
      'صوص سيزر',
      'caesar dressing',
      'ايولي',
      'aioli',
      'كريم كراميل',
      'بشاميل',
    ],
    crossContact: [],
    exceptions: ['مايونيز نباتي', 'vegan mayo', 'بديل البيض', 'egg replacer', 'بيض نباتي'],
  },
  {
    id: 'shellfish',
    label: { ar: 'القشريات', en: 'Shellfish' },
    direct: [
      'روبيان',
      'قريدس',
      'جمبري',
      'shrimp',
      'prawn',
      'سرطان البحر',
      'crab',
      'كابوريا',
      'استاكوزا',
      'lobster',
      'قشريات',
      'shellfish',
      'محار',
      'oyster',
      'اسكالوب',
      'scallop',
      'حبار',
      'squid',
      'كاليماري',
      'calamari',
      'اخطبوط',
      'octopus',
    ],
    derivative: [
      'مرق بحري',
      'seafood stock',
      'صوص المحار',
      'oyster sauce',
      'صوص السمك',
      'fish sauce',
      'صوص تايلندي',
      'باد تاي',
      'pad thai',
      'بايلا',
      'paella',
      'مكبوس بحري',
      'سي فود',
      'seafood',
      'سلطه بحريه',
      'صوص اسيوي',
    ],
    /** The guide's own example: fried fish out of the shared restaurant fryer. */
    crossContact: [
      'سمك مقلي',
      'fried fish',
      'مقلي في نفس الزيت',
      'shared fryer',
      'مشويات بحريه',
      'مطعم بحري',
    ],
    exceptions: [],
  },
  {
    id: 'fish',
    label: { ar: 'السمك', en: 'Fish' },
    direct: [
      'سمك',
      'fish',
      'تونه',
      'tuna',
      'سلمون',
      'salmon',
      'هامور',
      'كنعد',
      'شعري',
      'صافي',
      'سردين',
      'sardine',
      'انشوجه',
      'anchovy',
    ],
    derivative: [
      'صوص السمك',
      'fish sauce',
      'صوص سيزر',
      'caesar dressing',
      'ورشيستر',
      'worcestershire',
      'زيت السمك',
      'fish oil',
      'اوميغا 3',
      'مرق بحري',
      'سوشي',
      'sushi',
    ],
    crossContact: ['مقلي في نفس الزيت', 'shared fryer'],
    exceptions: [],
  },
  {
    id: 'soy',
    label: { ar: 'الصويا', en: 'Soy' },
    direct: ['صويا', 'soy', 'soya', 'فول الصويا', 'ادامامي', 'edamame'],
    derivative: [
      'صويا صوص',
      'soy sauce',
      'توفو',
      'tofu',
      'تمبيه',
      'tempeh',
      'ميسو',
      'miso',
      'بروتين نباتي',
      'زيت الصويا',
      'soybean oil',
      'ليسيثين الصويا',
      'soy lecithin',
      'حليب صويا',
      'soy milk',
      'صوص تيرياكي',
      'teriyaki',
    ],
    crossContact: [],
    exceptions: [],
  },
]

const BY_ID = new Map<AllergenId, AllergenGroup>(ALLERGENS.map((g) => [g.id, g]))

export function allergenLabel(id: AllergenId): { ar: string; en: string } {
  return BY_ID.get(id)?.label ?? { ar: id, en: id }
}

/**
 * Returns the text this group should be searched in, or null when a "free from"
 * claim clears the group outright. Exceptions mask their own span; a free-of
 * claim is a statement about the whole item, so it clears everything.
 */
function searchableFor(text: string, group: AllergenGroup): string | null {
  const named = [...group.direct, ...group.derivative]
  for (const segment of freeOfSegments(text)) {
    if (named.some((term) => matchesTerm(segment, term))) return null
  }
  return group.exceptions.length > 0 ? maskTerms(text, group.exceptions) : normalize(text)
}

/**
 * Every match against one ingredient string. Returns all groups, not the first,
 * so the rejection record names every allergen the item actually carries.
 */
export function matchIngredient(
  ingredient: string,
  allergies: readonly AllergenId[],
): AllergenMatch[] {
  const out: AllergenMatch[] = []
  for (const id of allergies) {
    const group = BY_ID.get(id)
    if (!group) continue
    const text = searchableFor(ingredient, group)
    if (text === null) continue

    const direct = findTerm(text, group.direct)
    if (direct !== null) {
      out.push({ allergen: id, term: direct, kind: 'direct' })
      continue
    }
    const derived = findTerm(text, group.derivative)
    if (derived !== null) {
      out.push({ allergen: id, term: derived, kind: 'derivative' })
      continue
    }
    const cross = findTerm(text, group.crossContact)
    if (cross !== null) {
      out.push({ allergen: id, term: cross, kind: 'cross-contact' })
    }
  }
  return out
}

export const allergenMap = {
  /** Mirrors the guide's `allergenMap.matches(item, profile.allergies)`. */
  matches(ingredient: string, allergies: readonly AllergenId[]): boolean {
    return matchIngredient(ingredient, allergies).length > 0
  },
  match: matchIngredient,
}
