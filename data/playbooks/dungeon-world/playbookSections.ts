/**
 * Class-specific template sections for Dungeon World, appended to the shared
 * `base.json` template at seed time (see prisma/seed.ts).
 *
 * Content is taken from the Dungeon World SRD (https://www.dungeonworldsrd.com),
 * by Sage LaTorra & Adam Koebel, licensed under CC BY. Race moves, alignment
 * moves, starting-move lists, damage dice and base HP are transcribed from the
 * SRD; starting gear is a representative selection of each class's real
 * load-out items.
 *
 * Field-type coverage is intentional: every class section exercises SELECT
 * (race), RADIO (alignment), TEXT (damage), CHECKBOX (starting gear) and an
 * isReadOnly TEXTAREA (starting moves), on top of the base template's
 * TEXT/TEXTAREA/TEXTNUMBER/COUNTER/PROGRESS fields.
 */
export const dungeonWorldPlaybookSpecificSections: Record<string, any[]> = {
  Bard: [
    {
      id: "class_details",
      title: "Bard",
      description: "Damage d6 · Base HP 6. Max HP = 6 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d6", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Elf", value: "elf", description: "When you enter an important location (your call) you can ask the GM for one fact from the history of that location." },
            { label: "Human", value: "human", description: "When you first enter a civilized settlement someone who respects the custom of hospitality to minstrels will take you in as their guest." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Perform your art to aid someone else." },
            { label: "Neutral", value: "neutral", description: "Avoid a conflict or defuse a tense situation." },
            { label: "Chaotic", value: "chaotic", description: "Spur others to significant and unplanned decisive action." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Arcane Art · Bardic Lore · Charming and Open · A Port in the Storm",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Leather armor (1 armor)", value: "leather_armor" },
            { label: "Ostentatious clothes", value: "ostentatious_clothes" },
            { label: "Dueling rapier (close, precise)", value: "dueling_rapier" },
            { label: "Fine lute", value: "fine_lute" },
            { label: "Adventuring gear", value: "adventuring_gear" },
            { label: "Bandages", value: "bandages" },
          ],
        },
      ],
    },
  ],

  Cleric: [
    {
      id: "class_details",
      title: "Cleric",
      description: "Damage d6 · Base HP 8. Max HP = 8 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d6", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Dwarf", value: "dwarf", description: "You are one with stone. When you commune you are also granted a special version of Words of the Unspeaking as a rote which only works on stone." },
            { label: "Human", value: "human", description: "Your faith is diverse. Choose one wizard spell. You can cast and be granted that spell as if it was a cleric spell." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Endanger yourself to heal another." },
            { label: "Lawful", value: "lawful", description: "Endanger yourself following the precepts of your church or god." },
            { label: "Evil", value: "evil", description: "Harm another to prove the superiority of your church or god." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Deity · Divine Guidance · Turn Undead · Commune · Cast a Spell",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Chainmail (1 armor)", value: "chainmail" },
            { label: "Shield (+1 armor)", value: "shield" },
            { label: "Warhammer (close)", value: "warhammer" },
            { label: "Mace (close)", value: "mace" },
            { label: "Adventuring gear", value: "adventuring_gear" },
            { label: "Healing potion", value: "healing_potion" },
          ],
        },
      ],
    },
  ],

  Druid: [
    {
      id: "class_details",
      title: "Druid",
      description: "Damage d6 · Base HP 6. Max HP = 6 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d6", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Elf", value: "elf", description: "The sap of the elder trees flows within you. In addition to any other attunements, the Great Forest is always considered your land." },
            { label: "Human", value: "human", description: "As your people learned to bind animals to field and farm, so too are you bound to them. You may always take the shape of any domesticated animal, in addition to your normal options." },
            { label: "Halfling", value: "halfling", description: "You sing the healing songs of spring and brook. When you make camp, you and your allies heal +1d6." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Help something or someone grow." },
            { label: "Neutral", value: "neutral", description: "Eliminate an unnatural menace." },
            { label: "Chaotic", value: "chaotic", description: "Destroy a symbol of civilization." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Born of the Soil · By Nature Sustained · Spirit Tongue · Shapeshifter · Studied Essence",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Hide armor (1 armor)", value: "hide_armor" },
            { label: "Wooden shield (+1 armor)", value: "wooden_shield" },
            { label: "Shillelagh (close)", value: "shillelagh" },
            { label: "Staff (close, two-handed)", value: "staff" },
            { label: "Spear (close, thrown, near)", value: "spear" },
            { label: "Adventuring gear", value: "adventuring_gear" },
          ],
        },
      ],
    },
  ],

  Fighter: [
    {
      id: "class_details",
      title: "Fighter",
      description: "Damage d10 · Base HP 10. Max HP = 10 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d10", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Dwarf", value: "dwarf", description: "When you share a drink with someone, you may parley with them using CON instead of CHA." },
            { label: "Elf", value: "elf", description: "Choose one weapon—you can always treat weapons of that type as if they had the precise tag." },
            { label: "Halfling", value: "halfling", description: "When you defy danger and use your small size to your advantage, take +1." },
            { label: "Human", value: "human", description: "Once per battle you may reroll a single damage roll (yours or someone else's)." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Defend those weaker than you." },
            { label: "Neutral", value: "neutral", description: "Defeat a worthy opponent." },
            { label: "Evil", value: "evil", description: "Kill a defenseless or surrendered enemy." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Bend Bars, Lift Gates · Armored · Signature Weapon",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Chainmail (1 armor)", value: "chainmail" },
            { label: "Scale armor (2 armor)", value: "scale_armor" },
            { label: "Shield (+1 armor)", value: "shield" },
            { label: "Healing potion", value: "healing_potion" },
            { label: "Antitoxin", value: "antitoxin" },
          ],
        },
      ],
    },
  ],

  Paladin: [
    {
      id: "class_details",
      title: "Paladin",
      description: "Damage d10 · Base HP 10. Max HP = 10 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d10", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Human", value: "human", description: "When you pray for guidance, even for a moment, and ask, 'What here is evil?' the GM will tell you, honestly." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Endanger yourself to protect someone weaker than you." },
            { label: "Lawful", value: "lawful", description: "Deny mercy to a criminal or unbeliever." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Lay on Hands · Armored · I Am the Law · Quest",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Scale armor (2 armor)", value: "scale_armor" },
            { label: "Halberd (reach, +1 damage, two-handed)", value: "halberd" },
            { label: "Long sword (close)", value: "long_sword" },
            { label: "Shield (+1 armor)", value: "shield" },
            { label: "Adventuring gear", value: "adventuring_gear" },
            { label: "Healing potion", value: "healing_potion" },
          ],
        },
      ],
    },
  ],

  Ranger: [
    {
      id: "class_details",
      title: "Ranger",
      description: "Damage d8 · Base HP 8. Max HP = 8 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d8", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Elf", value: "elf", description: "When you undertake a perilous journey through wilderness whatever job you take you succeed as if you rolled a 10+." },
            { label: "Human", value: "human", description: "When you make camp in a dungeon or city, you don't need to consume a ration." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Endanger yourself to combat an unnatural threat." },
            { label: "Neutral", value: "neutral", description: "Help an animal or spirit of the wild." },
            { label: "Chaotic", value: "chaotic", description: "Free someone from literal or figurative bonds." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Hunt and Track · Called Shot · Animal Companion · Command",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Leather armor (1 armor)", value: "leather_armor" },
            { label: "Hunter's bow (near, far)", value: "hunters_bow" },
            { label: "Short sword (close)", value: "short_sword" },
            { label: "Spear (close, thrown, near)", value: "spear" },
            { label: "Bundle of arrows (3 ammo)", value: "arrows" },
            { label: "Adventuring gear", value: "adventuring_gear" },
          ],
        },
      ],
    },
  ],

  Thief: [
    {
      id: "class_details",
      title: "Thief",
      description: "Damage d8 · Base HP 6. Max HP = 6 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d8", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Halfling", value: "halfling", description: "When you attack with a ranged weapon, deal +2 damage." },
            { label: "Human", value: "human", description: "You are a professional. When you spout lore or discern realities about criminal activities, take +1." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Chaotic", value: "chaotic", description: "Leap into danger without a plan." },
            { label: "Neutral", value: "neutral", description: "Avoid detection or infiltrate a location." },
            { label: "Evil", value: "evil", description: "Shift danger or blame from yourself to someone else." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Trap Expert · Tricks of the Trade · Backstab · Flexible Morals · Poisoner",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Leather armor (1 armor)", value: "leather_armor" },
            { label: "Dagger (hand)", value: "dagger" },
            { label: "Short sword (close)", value: "short_sword" },
            { label: "Rapier (close, precise)", value: "rapier" },
            { label: "3 throwing daggers (thrown, near)", value: "throwing_daggers" },
            { label: "Ragged bow (near)", value: "ragged_bow" },
            { label: "Adventuring gear", value: "adventuring_gear" },
            { label: "Healing potion", value: "healing_potion" },
          ],
        },
      ],
    },
  ],

  Wizard: [
    {
      id: "class_details",
      title: "Wizard",
      description: "Damage d4 · Base HP 4. Max HP = 4 + Constitution.",
      fields: [
        { id: "damage", label: "Damage", type: "TEXT", defaultValue: "d4", isReadOnly: true },
        {
          id: "race",
          label: "Race",
          type: "SELECT",
          defaultValue: "",
          options: [
            { label: "Elf", value: "elf", description: "Magic is as natural as breath to you. Detect Magic is a cantrip for you." },
            { label: "Human", value: "human", description: "Choose one cleric spell. You can cast it as if it was a wizard spell." },
          ],
        },
        {
          id: "alignment",
          label: "Alignment",
          type: "RADIO",
          defaultValue: "",
          options: [
            { label: "Good", value: "good", description: "Use magic to directly aid another." },
            { label: "Neutral", value: "neutral", description: "Discover something about a magical mystery." },
            { label: "Evil", value: "evil", description: "Use magic to cause terror and fear." },
          ],
        },
        {
          id: "starting_moves",
          label: "Starting Moves",
          type: "TEXTAREA",
          isReadOnly: true,
          defaultValue: "Spellbook · Prepare Spells · Cast a Spell · Spell Defense · Ritual",
        },
      ],
    },
    {
      id: "class_choices",
      title: "Starting Gear",
      fields: [
        {
          id: "gear_choice",
          label: "Choose your gear",
          type: "CHECKBOX",
          options: [
            { label: "Leather armor (1 armor)", value: "leather_armor" },
            { label: "Bag of books (5 uses)", value: "bag_of_books" },
            { label: "Dagger (hand)", value: "dagger" },
            { label: "Staff (close, two-handed)", value: "staff" },
            { label: "Healing potion", value: "healing_potion" },
            { label: "3 antitoxins", value: "antitoxins" },
          ],
        },
      ],
    },
  ],
};
