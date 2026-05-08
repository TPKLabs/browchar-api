export const apocalypseWorldPlaybookSpecificSections: Record<string, any[]> = {
  Angel: [
    {
      id: "angel_kit",
      title: "Angel Kit",
      fields: [
        {
          id: "stock",
          label: "Stock",
          type: "TEXTAREA",
        },
      ]
    }
  ],

  Battlebabe: [{
    id: "battlebabe_spec",
    fields: [{
      id: "battlebabe_custom_weapons",
      label: "Custom Weapons",
      type: "TEXTAREA",
    }]
  }],

  Brainer: [
  ],

  Chopper: [
    {
      id: "chopper_gang",
      title: "Gang",
      fields: [
        {
          id: "gang_size",
          label: " Size",
          type: "NUMBER",
        },
        {
          id: "gang_harm",
          label: " Harm",
          type: "TEXT",
        },
        {
          id: "gang_armor",
          label: " Armor",
          type: "TEXT"
        },
        { id: "gang_tags", label: " Tags", type: "TEXTAREA" }

      ]
    },
    {
      id: "chopper_bike",
      title: "Bike",
      fields: [
        {
          id: "bike_strength",
          label: "Strength",
          type: "TEXT",
        },
        {
          id: "bike_looks",
          label: "Looks",
          type: "TEXT"
        },
        { id: "bike_weaknesses", label: "Weaknesses", type: "TEXTAREA" }
      ]
    }
  ],

  Driver: [
    {
      id: "driver_cars",
      title: "Cars",
      fields: [
        {
          id: "driver_cars_frame",
          label: "Frame",
          type: "TEXT",
        },
        {
          id: "driver_cars_power",
          label: "Power",
          type: "TEXT",
        },
        {
          id: "driver_cars_armor",
          label: "Armor",
          type: "TEXT",
        },
        {
          id: "driver_cars_looks",
          label: "Looks",
          type: "TEXT",
        },
        {
          id: "driver_cars_weaknesses",
          label: "Weaknesses",
          type: "TEXT",
        },
        {
          id: "driver_cars_tags",
          label: "Tags",
          type: "TEXT",
        }
      ]
    }
  ],

  Gunlugger: [],

  Hardholder: [
    {
      id: "hardholder_holding",
      title: "Holding",
      fields: [
        {
          id: "hardholder_holding_size",
          label: "Size",
          type: "TEXTAREA",
        },
        {
          id: "hardholder_holding_gigs",
          label: "Gigs",
          type: "TEXTAREA",
        },
        {
          id: "hardholder_holding_barter",
          label: "Barter",
          type: "TEXTAREA",
        },
        {
          id: "hardholder_holding_surplus",
          label: "Surplus",
          type: "TEXTAREA",
        },
        {
          id: "hardholder_holding_want",
          label: "Want",
          type: "TEXTAREA",
        }
      ]
    },
    {
      id: "hardholder_gang",
      title: "Gang",
      fields: [
        {
          id: "hardholder_size",
          label: " Size",
          type: "NUMBER",
        },
        {
          id: "hardholder_harm",
          label: " Harm",
          type: "TEXT",
        },
        {
          id: "hardholder_armor",
          label: " Armor",
          type: "TEXT"
        },
        { id: "hardholder_tags", label: " Tags", type: "TEXTAREA" }

      ]
    },
  ],

  Hocus: [
    {
      id: "hocus_followers",
      title: "Followers",
      fields: [
        {
          id: "hocus_followers_description",
          label: "Description",
          type: "TEXTAREA",
        },
        {
          id: "hocus_followers_fortune",
          label: "Fortune",
          type: "TEXTAREA",
        },
        {
          id: "hocus_followers_barter",
          label: "Barter",
          type: "TEXTAREA",
        },
        {
          id: "hocus_followers_surplus",
          label: "Surplus",
          type: "TEXTAREA",
        },
        {
          id: "hocus_followers_want",
          label: "Want",
          type: "TEXTAREA",
        }
      ]
    }
  ],

  Operator: [
    {
      id: "operator_specific",
      fields: [
        {
          id: "gigs",
          label: "Gigs",
          type: "TEXTAREA",
          defaultValue: ""
        },
        {
          id: "crew",
          label: "Crew",
          type: "TEXTAREA",
          defaultValue: ""
        }
      ]
    }
  ],

  Savvyhead: [
    {
      id: "savvyhead_spec",
      fields: [
        {
          id: "workspace",
          label: "Workspace",
          type: "TEXTAREA",
          defaultValue: ""
        },
      ]
    }
  ],

  Skinner: [

  ]
};