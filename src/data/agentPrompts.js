export const AGENT_PROMPTS = {
  greeting: `Hey! I'm your EV trip agent. I'll help you plan the perfect Stockholm to Gothenburg drive using real community intelligence from fellow EV drivers.

Tell me about your trip — or I can ask you a few quick questions to get started. What's your EV model?`,

  askSoc: (ev) => `Great choice with the ${ev}! What's your current battery level? (e.g., "90%" or "full")`,

  askTraveler: `Who's riding along?`,

  askDay: `When are you planning to travel?`,

  askPriorities: `Almost there! What matters most to you on this trip?`,

  askDeparture: `Last one — what time are you planning to leave?`,
};
