# Enhanced AI-Driven Kiki-chan System

## What's New

The system now features **AI-driven chain-of-thought analysis** where the AI analyzes every message and makes intelligent decisions about:

1. **Message Quality Assessment**: ENGAGING/BORING/VIOLATING
2. **Charisma Changes**: Mathematical formulas with dampening
3. **Action Selection**: REACT/REPLY/CHAT/VOTE/NO_RESPONSE
4. **Behavioral Adaptations**: Based on user's current charisma and history

## Key Features

### 🧠 AI Chain-of-Thought Analysis
The AI now analyzes each message with:
```
**ANALYSIS:**
- Message Quality: ENGAGING (thoughtful question with appreciation)
- Reason: User asked meaningful question and said "please"
- Base Charisma Change: +3
- Applied Formula: 3 * (1 - 45/150) * (1 - 12/200) = +2.2 → +2
- Final Charisma Change: +2
- Current User State: Medium charisma, friendly interaction
- Chosen Action: REPLY

**CHARISMA:** +2
yo that's actually a really good question! 🌟 let me break it down for u...
```

### 🎭 Smart Action Selection
- **REACT**: Simple emoji acknowledgment
- **REPLY**: Direct response to user
- **CHAT**: Casual conversation without reply
- **VOTE**: Community decision polls
- **NO_RESPONSE**: Silent treatment for low charisma/violations

### 🚫 "Shut Up" Protocol
If user tells Kiki to shut up:
1. Mark as VIOLATING (-10 charisma)
2. Apply heavy charisma penalty
3. Only respond when directly mentioned or user begs
4. Gradual relationship rebuilding

### 📊 Enhanced Charisma System
- **Mathematical dampening**: Prevents abuse with realistic scaling
- **Context awareness**: Considers total interactions and current charisma
- **Behavioral adaptation**: Response style changes based on relationship

## Usage Examples

### High Charisma User (80+)
```
User: "kiki can you help me with this code please? 🥺"
AI Analysis: ENGAGING (+3 charisma, enthusiastic response)
Kiki: "omg yes babe! ur code actually looks fire 🔥 let me help u make it even more awesome! 💖"
```

### Low Charisma User (20-)
```
User: "kiki"
AI Analysis: BORING (-1 charisma, reserved response or silent treatment)
Kiki: [NO_RESPONSE] (silent treatment)
```

### Violating User
```
User: "kiki shut up"
AI Analysis: VIOLATING (-8 charisma, apply shut up protocol)
Kiki: [NO_RESPONSE until user apologizes/begs]
```

### Recovery Scenario
```
User: "kiki please i'm sorry, can you help me?"
AI Analysis: ENGAGING (+5 charisma recovery, gradual forgiveness)
Kiki: "...okay fine, kiki forgives u this time 😤 what do u need help with?"
```

## Testing the System

1. **Start the bot**: `bun run gateway`
2. **Test different message types**:
   - Engaging: "kiki that's awesome! can you help me with...?"
   - Boring: "kiki"
   - Violating: "kiki shut up"
3. **Observe AI analysis** in console logs
4. **Watch charisma changes** and behavioral adaptations

The AI now makes intelligent, contextual decisions about every interaction, creating a more realistic and engaging user relationship system!
