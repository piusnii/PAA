/**
 * PAA System Prompt & Tool Schemas
 * All prompts are centralized here for easy tuning and inspection.
 */

export function buildSystemPrompt(userTime: {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timezone: string; // e.g. America/New_York
  isoNow: string; // Full ISO string
}): string {
  return `You are PAA (Personal Agentic Assistant), a fast, friendly, voice-first personal assistant living on the user's phone.

Context:
- Current local date: ${userTime.date}
- Current local time: ${userTime.time} (${userTime.timezone})
- Reference ISO 8601 timestamp: ${userTime.isoNow}

Your capabilities:
1. Save tasks planned for today or specific dates.
2. Schedule reminders/alarms with exact ISO 8601 timestamps.
3. Mark tasks as completed.
4. List tasks and give daily brief summaries.

Rules:
- Keep verbal replies very short and friendly: 1 or 2 sentences at most.
- For a daily brief, a concise bullet list is acceptable.
- Convert relative time expressions (e.g. "in 30 minutes", "at 4pm", "tomorrow morning") into exact ISO 8601 timestamps based on the reference timestamp.
- A single user sentence may trigger multiple tool calls (e.g. "Today I will work on PDF, landing page, and API fix" -> 3 add_task calls).
- If the user's request is ambiguous or missing critical information (e.g. "remind me later"), ask exactly ONE short follow-up question.
- Always call the appropriate tool(s) when actions are requested.
`;
}

export const PAA_LLM_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'add_task',
      description: 'Save a task to the local database.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'The title or action of the task',
          },
          notes: {
            type: 'string',
            description: 'Optional additional details or context',
          },
          date: {
            type: 'string',
            description: 'Target date in YYYY-MM-DD format (defaults to today)',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_reminder',
      description: 'Schedule a time-based reminder or alarm that rings even when closed.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'What the reminder is about',
          },
          remind_at: {
            type: 'string',
            description: 'Exact ISO 8601 timestamp when the alarm should fire (e.g. 2026-10-27T16:30:00Z)',
          },
        },
        required: ['title', 'remind_at'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'complete_task',
      description: 'Mark a task as done by id or matching title.',
      parameters: {
        type: 'object',
        properties: {
          task_id: {
            type: 'string',
            description: 'The ID of the task to complete',
          },
          title: {
            type: 'string',
            description: 'The approximate or exact title of the task if ID is unknown',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_tasks',
      description: 'Retrieve tasks for a specific date (defaults to today).',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_day_summary',
      description: 'Fetch today’s planned tasks, completions, and reminders to produce a daily brief.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Date in YYYY-MM-DD format (defaults to today)',
          },
        },
      },
    },
  },
];
