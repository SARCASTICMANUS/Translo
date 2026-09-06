import type { CallHistoryEntry, Order, ScriptTurn } from "@/types";

export const WORKER_PERSONA = {
  name: "Rajesh Kumar",
  initials: "RK",
  language: "hi",
};

/** Today's assigned deliveries, in call order. */
export const ORDERS: Order[] = [
  {
    id: "o-4829",
    orderNumber: "4829",
    customerName: "Ananya Sharma",
    customerInitials: "AS",
    customerLanguage: "en",
    address: "Prestige Tech Park, Gate 2, Kadubeesanahalli, Bengaluru 560103",
    addressShort: "Prestige Tech Park, Gate 2",
    items: ["Butter Chicken ×1", "Garlic Naan ×2", "Gulab Jamun ×2"],
    etaMinutes: 8,
    status: "Ready to call",
  },
  {
    id: "o-4817",
    orderNumber: "4817",
    customerName: "Kiran Kumar",
    customerInitials: "KK",
    customerLanguage: "ta",
    address: "24th Main Road, HSR Layout, Sector 3, Bengaluru 560102",
    addressShort: "24th Main, HSR Layout",
    items: ["Veg Biryani ×1", "Raita ×1", "Coke ×1"],
    etaMinutes: 12,
    status: "Ready to call",
  },
  {
    id: "o-4802",
    orderNumber: "4802",
    customerName: "Sneha Reddy",
    customerInitials: "SR",
    customerLanguage: "kn",
    address: "3rd Floor, Salarpuria Sattva, Whitefield Main Rd, Bengaluru 560066",
    addressShort: "Salarpuria, Whitefield Main Rd",
    items: ["Paneer Tikka ×1", "Butter Roti ×3", "Sweet Lassi ×1"],
    etaMinutes: 17,
    status: "Ready to call",
  },
];

export function getOrder(id: string): Order | undefined {
  return ORDERS.find((order) => order.id === id);
}

/**
 * The scripted conversation for an active call. Worker speaks Hindi,
 * customer speaks their order language. One turn carries filler words /
 * self-correction to show natural speech cleanup, and one turn carries an
 * AI-detected location detail.
 */
export function buildCallScript(customerLanguage: string): ScriptTurn[] {
  return [
    {
      id: "t1",
      speaker: "worker",
      // Filler + self-correction stay in the raw line; not translated.
      raw: "Umm sir actually main… Gate 3… sorry, Gate 2 pe hoon. Aap gate ki taraf aa sakte hain.",
      translated: "I'm at Gate 2. You can come towards the gate.",
      rawLang: "hi",
      targetLang: customerLanguage,
      detected: {
        label: "Meet at Gate 2",
        detail: "Prestige Tech Park, Gate 2 — main meeting point",
      },
    },
    {
      id: "t2",
      speaker: "customer",
      raw: "Okay, I'll be by the security desk in about two minutes. Are you on a bike?",
      translated: "ठीक है, मैं लगभग दो मिनट में सिक्योरिटी डेस्क के पास होऊँगा। क्या आप बाइक पर हैं?",
      rawLang: customerLanguage,
      targetLang: "hi",
    },
    {
      id: "t3",
      speaker: "worker",
      raw: "Haan ji, scooter pe hoon, number KA 01 AB 4829. Paanch minute mein pahunch jaoonga.",
      translated: "Yes, I'm on the scooter, KA 01 AB 4829. I'll be there in five minutes.",
      rawLang: "hi",
      targetLang: customerLanguage,
    },
    {
      id: "t4",
      speaker: "customer",
      raw: "Perfect. Please just leave the parcel at the desk, I'll collect it there.",
      translated: "बढ़िया। पार्सल डेस्क पर ही छोड़ दीजिए, मैं वहीं से ले लूँगा।",
      rawLang: customerLanguage,
      targetLang: "hi",
    },
    {
      id: "t5",
      speaker: "worker",
      raw: "Pakka, desk pe chhod dunga. Thank you, sir.",
      translated: "Done, I'll leave it at the desk. Thank you.",
      rawLang: "hi",
      targetLang: customerLanguage,
    },
  ];
}

/** Past calls for the History tab. */
export const CALL_HISTORY: CallHistoryEntry[] = [
  {
    id: "h-4750",
    customerName: "Priya Nair",
    customerInitials: "PN",
    orderNumber: "4750",
    dateLabel: "Today",
    timeLabel: "10:42 AM",
    durationSeconds: 252,
    languageFrom: "hi",
    languageTo: "ml",
    transcript: [
      {
        id: "ht1",
        speaker: "worker",
        raw: "Madam, mainives saya gate par hoon, building ke saamne.",
        translated: "Madam, I'm at the main gate, in front of the building.",
        rawLang: "hi",
        targetLang: "ml",
      },
      {
        id: "ht2",
        speaker: "customer",
        raw: "I'm coming down, please wait two minutes.",
        translated: "मैं नीचे आ रही हूँ, दो मिनट रुकिए।",
        rawLang: "ml",
        targetLang: "hi",
      },
    ],
  },
  {
    id: "h-4712",
    customerName: "Ramesh Bhat",
    customerInitials: "RB",
    orderNumber: "4712",
    dateLabel: "Yesterday",
    timeLabel: "6:18 PM",
    durationSeconds: 228,
    languageFrom: "hi",
    languageTo: "en",
    transcript: [
      {
        id: "ht1",
        speaker: "worker",
        raw: "Sir, order ghar ke bahar table par rakh diya hai.",
        translated: "Sir, I've left the order on the table outside your house.",
        rawLang: "hi",
        targetLang: "en",
      },
      {
        id: "ht2",
        speaker: "customer",
        raw: "Thanks a lot, got it. Have a good day.",
        translated: "बहुत शुक्रिया, मिल गया। आपका दिन अच्छा रहे।",
        rawLang: "en",
        targetLang: "hi",
      },
    ],
  },
  {
    id: "h-4698",
    customerName: "Fatima Syed",
    customerInitials: "FS",
    orderNumber: "4698",
    dateLabel: "23 Jul",
    timeLabel: "1:05 PM",
    durationSeconds: 125,
    languageFrom: "hi",
    languageTo: "ta",
    transcript: [
      {
        id: "ht1",
        speaker: "worker",
        raw: "Madam, gate lock tha, isliye WhatsApp pe baat kiya.",
        translated: "Madam, the gate was locked, so we talked on WhatsApp.",
        rawLang: "hi",
        targetLang: "ta",
      },
      {
        id: "ht2",
        speaker: "customer",
        raw: "Please throw it over the wall, thank you.",
        translated: "कृपया दीवार के ऊपर से फेंक दीजिए, धन्यवाद।",
        rawLang: "ta",
        targetLang: "hi",
      },
    ],
  },
];

export function getHistoryEntry(id: string): CallHistoryEntry | undefined {
  return CALL_HISTORY.find((entry) => entry.id === id);
}

/** Mock "AI summary" of a finished call. */
export function callSummary(order: Order): string {
  const customerFirst = order.customerName.split(" ")[0];
  return `${customerFirst} will meet you at the gate — parcel to be left at the security desk. Both sides agreed on the location and pickup in that call.`;
}