export const USER_TEMPLATE = `# Edit Request

## Current Content
{content}

## Edit Instruction
{instruction}

## Language
{language}

## Format Reminder
You MUST follow the DIFF format exactly as specified in your system prompt:
- @ line: Context BEFORE the change (do not include the text to change)
- - line: Text to delete (exact match)
- + line: Text to add
- End with [EOF]

Return ONLY the DIFF. No explanations.`;