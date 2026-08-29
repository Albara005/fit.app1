import { describe, expect, it } from 'vitest'
import { ALLERGENS, allergenLabel, allergenMap, matchIngredient } from '../../lib/safety/allergens'
import { normalize } from '../../lib/safety/text'

const hits = (text: string, allergies: Parameters<typeof matchIngredient>[1]) =>
  matchIngredient(text, allergies).map((m) => `${m.allergen}:${m.kind}`)

describe('normalize', () => {
  it('strips diacritics, tatweel and unifies alef/yaa/taa marbuta', () => {
    expect(normalize('الطَّحِينَة')).toBe(normalize('الطحينه'))
    expect(normalize('حــلــيــب')).toBe('حليب')
    expect(normalize('مُصَفّى')).toBe(normalize('مصفي'))
  })

  it('converts Arabic-Indic digits to Western digits', () => {
    expect(normalize('٢٠٠ جرام')).toBe('200 جرام')
  })
})

describe('derivative matching — the cases plain substring search gets wrong', () => {
  it('catches tahini for a sesame allergy', () => {
    expect(hits('سلطة بالطحينة', ['sesame'])).toEqual(['sesame:derivative'])
  })

  it('catches hummus and dukkah for a sesame allergy', () => {
    expect(allergenMap.matches('حمص بالزيت', ['sesame'])).toBe(true)
    expect(allergenMap.matches('دقة عمانية', ['sesame'])).toBe(true)
  })

  it('catches whey protein for a dairy allergy', () => {
    expect(hits('بروتين واي', ['dairy'])).toEqual(['dairy:derivative'])
    expect(allergenMap.matches('whey protein isolate', ['dairy'])).toBe(true)
  })

  it('catches harees and freekeh for a gluten allergy', () => {
    expect(allergenMap.matches('هريس لحم', ['gluten'])).toBe(true)
    expect(allergenMap.matches('فريكة بالدجاج', ['gluten'])).toBe(true)
  })

  it('catches almond-garnished rice for a tree-nut allergy', () => {
    expect(allergenMap.matches('أرز مزيّن باللوز', ['treenut'])).toBe(true)
    expect(allergenMap.matches('نوتيلا', ['treenut'])).toBe(true)
  })

  it('catches mayonnaise and shakshuka for an egg allergy', () => {
    expect(allergenMap.matches('صوص مايونيز', ['egg'])).toBe(true)
    expect(allergenMap.matches('شكشوكة', ['egg'])).toBe(true)
  })

  it('flags fried fish as cross-contact for a shellfish allergy', () => {
    expect(hits('سمك مقلي', ['shellfish'])).toEqual(['shellfish:cross-contact'])
  })
})

describe('false positives that would wreck the plan', () => {
  it('does not read "لبن" inside "لبناني"', () => {
    expect(allergenMap.matches('خبز لبناني', ['dairy'])).toBe(false)
  })

  it('does not read dairy in almond milk, but does read tree nut', () => {
    expect(allergenMap.matches('حليب لوز', ['dairy'])).toBe(false)
    expect(allergenMap.matches('حليب لوز', ['treenut'])).toBe(true)
  })

  it('does not read dairy in peanut butter, but does read peanut', () => {
    expect(allergenMap.matches('زبدة الفول السوداني', ['dairy'])).toBe(false)
    expect(allergenMap.matches('زبدة الفول السوداني', ['peanut'])).toBe(true)
    expect(allergenMap.matches('peanut butter', ['dairy'])).toBe(false)
  })

  it('does not read tree nut in coconut', () => {
    expect(allergenMap.matches('جوز الهند', ['treenut'])).toBe(false)
    expect(allergenMap.matches('حليب جوز الهند', ['treenut'])).toBe(false)
  })

  it('does not read peanut in broad beans', () => {
    expect(allergenMap.matches('فول مدمس', ['peanut'])).toBe(false)
  })

  it('does not read flour in tahini — طحين is not طحينة', () => {
    expect(allergenMap.matches('طحينة', ['gluten'])).toBe(false)
    expect(allergenMap.matches('سلطة بالطحينة', ['gluten'])).toBe(false)
    expect(allergenMap.matches('طحينة', ['sesame'])).toBe(true)
    expect(allergenMap.matches('دقيق قمح', ['gluten'])).toBe(true)
  })

  it('an exception masks its own span, it does not clear the group', () => {
    // Both are present; excusing one must not excuse the other.
    expect(hits('طحينة وخبز', ['gluten', 'sesame']).sort()).toEqual(
      ['gluten:derivative', 'sesame:derivative'].sort(),
    )
    expect(allergenMap.matches('جوز الهند واللوز', ['treenut'])).toBe(true)
    expect(allergenMap.matches('حليب لوز وزبادي', ['dairy'])).toBe(true)
  })

  it('honours "خالي من" and "-free" claims', () => {
    expect(allergenMap.matches('خبز خالي من الجلوتين', ['gluten'])).toBe(false)
    expect(allergenMap.matches('dairy-free yoghurt', ['dairy'])).toBe(false)
  })

  it('does not clear an allergen the free-of claim does not name', () => {
    expect(allergenMap.matches('كيك خالي من الجلوتين', ['egg'])).toBe(true)
  })
})

describe('clitics and inflection', () => {
  it.each([
    ['الحليب', true],
    ['بالحليب', true],
    ['وحليب', true],
    ['للحليب', false],
    ['حليبات', true],
  ])('%s', (text, expected) => {
    expect(allergenMap.matches(text, ['dairy'])).toBe(expected)
  })
})

describe('multiple allergies', () => {
  it('reports every allergen an item carries, not just the first', () => {
    expect(hits('كنافة بالفستق', ['gluten', 'treenut', 'dairy']).sort()).toEqual(
      ['dairy:derivative', 'gluten:derivative', 'treenut:direct'].sort(),
    )
  })

  it('reports nothing when the user has no allergies', () => {
    expect(matchIngredient('طحينة وحليب وكنافة', [])).toEqual([])
  })

  it('ignores unknown allergen ids', () => {
    // @ts-expect-error deliberately passing an id outside the union
    expect(matchIngredient('طحينة', ['unicorn'])).toEqual([])
  })
})

describe('allergenLabel', () => {
  it('labels every allergen in both languages', () => {
    for (const group of ALLERGENS) {
      const label = allergenLabel(group.id)
      expect(label.ar.length).toBeGreaterThan(0)
      expect(label.en.length).toBeGreaterThan(0)
    }
  })

  it('falls back to the raw id for an allergen removed from the map', () => {
    // Profiles persist ids; a renamed group must not crash a settings screen.
    expect(allergenLabel('retired_group' as never)).toEqual({
      ar: 'retired_group',
      en: 'retired_group',
    })
  })
})
