import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { provider, apiKey, model, messages, systemPrompt } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 400 });
    }

    // OpenAI & Grok (OpenAI互換)
    if (provider === 'openai' || provider === 'grok') {
      const baseUrl = provider === 'grok' 
        ? 'https://api.x.ai/v1/chat/completions' 
        : 'https://api.openai.com/v1/chat/completions';

      const formattedMessages = [];
      if (systemPrompt) formattedMessages.push({ role: 'system', content: systemPrompt });

      messages.forEach((m: any) => {
        formattedMessages.push({
          role: m.role,
          content: m.content
        });
      });

      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model, messages: formattedMessages })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API エラーが発生しました');
      return NextResponse.json({ result: data.choices[0].message.content });
    }

    // Anthropic (Claude)
    if (provider === 'anthropic') {
      const formattedMessages = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt || undefined,
          messages: formattedMessages
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Claude API エラー');
      return NextResponse.json({ result: data.content[0].text });
    }

    // Google (Gemini)
    if (provider === 'gemini') {
      const contents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Gemini API エラー');
      return NextResponse.json({ result: data.candidates[0].content.parts[0].text });
    }

    return NextResponse.json({ error: '未対応のプロバイダーです' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || '内部エラー' }, { status: 500 });
  }
}
