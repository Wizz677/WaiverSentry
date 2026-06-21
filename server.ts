/**
 * Server router and API proxy for WaiverSentry
 * Express backend integrating server-side Gemini API with fallback mechanisms
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import https from 'https';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client


let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      console.warn('GEMINI_API_KEY is not defined or is placeholder. Using high-fidelity analytical fallback.');
      return null;
    }
    try {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    } catch (e) {
      console.error('Failed to initialize GoogleGenAI client:', e);
      return null;
    }
  }
  return aiClient;
}

// ==========================================
// API ENDPOINT: AI WAIVER RISK SECURITY ANALYST
// ==========================================
app.post('/api/analyze-waiver', async (req, res) => {
  const { title, description, type, justification, businessCriticality, accessLevel, compensatingControls } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    // High-fidelity local fallback if no API key is set
    const fallbackData = getFallbackAnalysis(title, type, justification, accessLevel, businessCriticality, compensatingControls || []);
    return res.json({ ...fallbackData, simulated: true });
  }

  try {
    const prompt = `
      You are an expert Cybersecurity Architect, CISO, and GRC Analyst reviewing a proposed Policy Waiver or Exception Request.
      Analyze the request details thoroughly and return your quantitative and qualitative assessment.

      REQUEST DETAILS:
      - Title: ${title || 'Untitled exception'}
      - Exception Type: ${type}
      - System Affected & Business Criticality: ${businessCriticality}
      - Identity Access Tier: ${accessLevel}
      - Detailed Technical Justification: ${justification || 'No justification provided.'}
      - Existing Compensating Controls Mapped: ${JSON.stringify(compensatingControls || [])}

      Your task:
      1. Challenge assumptions. Identify the hidden attack paths, potential lateral movement risks, or compliance exposures.
      2. Grade the business justification quality on a scale of 0 to 10. (e.g. 10 = absolute necessity with robust isolation, 0 = convenience, laziness, or severe negligence).
      3. Recommend exactly 3 concrete technical steps the engineering or DevOps teams should execute to restrict potential abuse.
      4. Suggest if better predefined compensating controls (e.g., "ip_whitelist", "siem_alerting", "dual_auth", "jit_isolation") would make this waiver safer.
      5. Draft a CISO assessment detailing whether you accept, accept with caveats, or reject this exception, with a professional tone.

      You MUST respond strictly in valid JSON format matching the schema requested. Do not include markdown code blocks other than what is handled by responseMimeType.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are WaiverSentry AI Advisor, a world-class Cybersecurity Architect assisting teams in evaluating risk exceptions and security policy waivers. Speak technically, constructively, and objectively.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            justificationScore: {
              type: Type.INTEGER,
              description: 'A score from 0 to 10 evaluating the validity of the business reasoning.'
            },
            justificationGrade: {
              type: Type.STRING,
              description: 'Letter grade representing justification quality (A, B, C, D, or F).'
            },
            threatAnalysis: {
              type: Type.STRING,
              description: 'Exhaustive technical assessment of attack vectors, compliance failures, or lateral movement exposure created by this waiver.'
            },
            remediationPlan: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Exactly 3 actionable technical remediation actions for the hosting system.'
            },
            recommendedCompensatingControls: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Predefined control handles to recommend: "ip_whitelist", "siem_alerting", "dual_auth", "daily_review", "jit_isolation".'
            },
            cisoAssessment: {
              type: Type.STRING,
              description: 'Executive opinion statement summarizing authorization alignment and policy recommendations.'
            }
          },
          required: [
            'justificationScore',
            'justificationGrade',
            'threatAnalysis',
            'remediationPlan',
            'recommendedCompensatingControls',
            'cisoAssessment'
          ]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty response received from Gemini engine');
    }

    try {
      const parsed = JSON.parse(text);
      res.json({ ...parsed, simulated: false });
    } catch (parseError) {
      console.error('Failed to parse JSON response from Gemini:', text, parseError);
      // Fallback on structural parsing error
      const fallbackData = getFallbackAnalysis(title, type, justification, accessLevel, businessCriticality, compensatingControls || []);
      res.json({ ...fallbackData, simulated: true, note: 'Had to use fallback due to structural parsing anomalies' });
    }
  } catch (error: any) {
    if (error.status === 503) {
      console.warn('Gemini API is currently overloaded (503). Using analytical fallback.');
    } else {
      console.error('Error in Gemini analysis route:', error);
    }
    const fallbackData = getFallbackAnalysis(title, type, justification, accessLevel, businessCriticality, compensatingControls || []);
    res.json({ ...fallbackData, simulated: true, error: error.message || 'Error occurred during processing' });
  }
});

// ==========================================
// API ENDPOINT: AI COPILOT & ADVISOR CHAT
// ==========================================
app.post('/api/copilot', async (req, res) => {
  const { messages, contextWaiver } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Fallback simulated response
    const lastMessage = messages[messages.length - 1]?.content || '';
    const simulatedAnswer = getSimpleFallbackAnswer(lastMessage, contextWaiver);
    return res.json({ text: simulatedAnswer, simulated: true });
  }

  try {
    // Construct chat history format for Gemini
    const systemPrompt = `
      You are WaiverSentry AI Advisor, an expert Cybersecurity GRC Co-pilot, CISO Chief-of-Staff, and NIST/ISO Compliance Auditing Assistant.
      You help security teams, auditors, and systems engineers navigate policy waiving processes without exposing corporate networks to severe attack vectors.

      Your expertise includes:
      - Explaining risk coefficients, compensating controls, and mitigation scopes.
      - Mapping exceptions to ISO 27001 (A.5.15, A.8.20), SOC 2 (CC6.1, CC6.3), NIST SP 800-53, and PCI DSS v4.0.
      - Recommending security architectures (OIDC/SAML integration, IAM identity bounds, reverse-proxy whitelists).
      - Reviewing justifications objectively (e.g. challenging lazy justifications and enforcing strict isolation).

      ${contextWaiver ? `The user is currently inspecting the following waiver in the registry:
      - Title: "${contextWaiver.title}"
      - Code: "${contextWaiver.id}"
      - Type: "${contextWaiver.type}"
      - Status: "${contextWaiver.status}"
      - Criticality: "${contextWaiver.businessCriticality}"
      - Exposure Level: "${contextWaiver.accessLevel}"
      - Justification: "${contextWaiver.justification}"
      - Calculated Risk Score: ${contextWaiver.riskScore}/100 [Category: ${contextWaiver.riskCategory.toUpperCase()}]
      - Active Controls: ${JSON.stringify(contextWaiver.compensatingControls || [])}` : 'No active policy exception is selected. Answer general GRC questions.'}

      Provide highly expert, realistic, technical and concise GRC advisory responses. Maintain professional composure.
    `;

    // Map messages payload to contents array
    const formattedContents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7
      }
    });

    res.json({ text: response.text || 'I failed to generate an advisory report. Please try again.', simulated: false });
  } catch (error: any) {
    if (error.status === 503) {
      console.warn('Gemini API is currently overloaded (503). Using copilot analytical fallback.');
    } else {
      console.error('Error in Copilot endpoint:', error);
    }
    const lastMessage = messages[messages.length - 1]?.content || '';
    const simulatedAnswer = getSimpleFallbackAnswer(lastMessage, contextWaiver);
    res.json({ text: simulatedAnswer + '\n\n*(Note: Running in high-fidelity sandbox context because raw Gemini request timed out or was unkeyed)*', simulated: true });
  }
});

// ==========================================
// HEURISTIC / ALGORITHMIC FALLBACKS (NO-KEY)
// ==========================================
function getFallbackAnalysis(
  title: string,
  type: string,
  justification: string,
  accessLevel: string,
  criticality: string,
  controls: string[]
) {
  // Simple heuristic grading for fallback
  const justText = (justification || '').toLowerCase();
  let score = 5;
  let grade = 'C';

  if (!justification || justification.length < 20) {
    score = 2;
    grade = 'F';
  } else if (justText.includes('legacy') || justText.includes('outage') || justText.includes('emergency') || justText.includes('failed')) {
    score = 8;
    grade = 'B';
  } else if (justText.includes('convenience') || justText.includes('lazy') || justText.includes('home') || justText.includes('easier')) {
    score = 3;
    grade = 'D';
  } else if (justification.length > 100) {
    score = 9;
    grade = 'A';
  }

  // Generate realistic threats based on exception types
  let threat = 'General compliance exposure. Audit tracking is disrupted, leading to governance drift.';
  let remediations = [
    'Monitor active account activities via consolidated SIEM telemetry alerts.',
    'Force default de-provisioning window of exactly 7 days.',
    'Require second peer administrator to witness and counter-approve access logs.'
  ];
  let recommended = ['siem_alerting'];

  switch (type) {
    case 'mfa_bypass':
      threat = `Severe threat of authentication compromise. Leaving access un-MFA'd enables automated botnets to test credential stuffing or brute force attack paths on legacy service protocols without notification.`;
      remediations = [
        'Enforce rigid source IP whitelisting to restricts connections purely to Jenkins/deploy gateways.',
        'Rotate underlying secrets/API tokens every 48 hours via automated Vault scripts.',
        'Establish automated, real-time alerts on any connection sourced outside of the corporate IP range.'
      ];
      recommended = ['ip_whitelist', 'siem_alerting'];
      break;
    case 'firewall_rule':
      threat = `Opening ports to external blocks creates open vector exploration. Sourcing malicious request payloads through untracked nodes can target system services with known SQL injection or exploit patterns directly.`;
      remediations = [
        'Deploy deep packet inspection (IDS/IPS) rules specifically focused on the newly opened egress port range.',
        'Formally request a daily IP address lookup verification for the offshore agency.',
        'Ensure the port tunnel terminates in a secure isolation VLAN sandbox.'
      ];
      recommended = ['ip_whitelist', 'jit_isolation'];
      break;
    case 'admin_privilege':
      threat = `Granting temporary domain admin or super admin state expands blast radius. Compromise of this targeted identity permits full lateral credential dumping, disabling server antivirus systems, or bulk file modifications.`;
      remediations = [
        'Audit all actions executed with this privilege on a 15-minute sync basis.',
        'Implement automatic token revocation immediately at the 48-hour threshold without exceptions.',
        'Disable administrative remote logins from outside local physical network segments.'
      ];
      recommended = ['dual_auth', 'siem_alerting', 'daily_review'];
      break;
    case 'password_policy':
      threat = `Lowering complexity metrics on historical databases exposes endpoints to rapid dictionary-based dictionary cracking or offline hash discovery if db elements migrate to backup stores.`;
      remediations = [
        'Thoroughly isolate Accounting AS400 endpoints inside an offline VPN tier.',
        'Configure SIEM triggers to lock the account on exactly 3 consecutive login failure attempts.',
        'Verify backup dumps are fully encrypted with modern AES-256 GCM configurations.'
      ];
      recommended = ['siem_alerting', 'jit_isolation'];
      break;
    case 'third_party_access':
      threat = `Supply-chain vulnerability vectors are elevated. Inadequate sandboxing on external CPA or legal agencies opens pathways where compromised external machines hop directly to treasury ledger files.`;
      remediations = [
        'Create a separate ephemeral database read replica rather than linking to production master pools.',
        'Enforce detailed multi-session authorization logs (dual control signatures).',
        'Configure automated access teardown immediately at midnight daily.'
      ];
      recommended = ['jit_isolation', 'siem_alerting', 'daily_review'];
      break;
  }

  let ciso = `The exception for "${title || 'Untitled exception'}" presents significant operational risk ${score < 5 ? 'and is highly discouraged due to weak business justification' : 'but is defensible provided strict security controls are maintained'}. `;
  ciso += `I authorize this deviation purely on the condition that ${controls.length > 0 ? 'the declared controls remain continuously active' : 'immediate whitelisting and SIEM alerting compensating measures be enforced'}. Must be resolved on schedule.`;

  return {
    justificationScore: score,
    justificationGrade: grade,
    threatAnalysis: threat,
    remediationPlan: remediations,
    recommendedCompensatingControls: recommended,
    cisoAssessment: ciso
  };
}

function getSimpleFallbackAnswer(query: string, context: any): string {
  const q = query.toLowerCase();
  let text = '';

  if (context) {
    if (q.includes('mitigate') || q.includes('reduce') || q.includes('control')) {
      text = `Regarding **${context.title}** (Risk Score: ${context.riskScore}/100), the most effective way to reduce the immediate danger is to apply:
1. **IP Whitelisting & CIDR Pinning** to prevent arbitrary networks from detecting the bypass endpoint.
2. Configure **SIEM Log Aggregation & Probing** to ensure any actions executed trigger high-priority alerts inside the SOC console.

Once configured, we can apply an architectural risk discount of up to **25%** in our scorecard.`;
    } else if (q.includes('standards') || q.includes('framework') || q.includes('compliance')) {
      text = `This active exception affects multiple industry standards. Specifically:
- **${context.complianceMappings.join(' & ')}** are currently in a state of controlled non-compliance.
- Internal auditor logs should mark this record with token ID \`${context.id}\` to prove administrative accountability during standard SOC 2 Type II review processes.`;
    } else {
      text = `Hello! I am analyzing the active exception **${context.id}** (*${context.title}*).
      
Based on its **${context.businessCriticality}** business criticality and **${context.accessLevel}** access privileges, our risk scoring engine categorized this as a **${context.riskCategory.toUpperCase()}** priority. 

Justification validation score stands at **${context.justificationScore}/10**. 

What in-depth threat vectors or regulatory remediations can I draft for you regarding this resource gap?`;
    }
  } else {
    // General Q&A
    if (q.includes('mfa') || q.includes('multifactor')) {
      text = `Multi-Factor Authentication (MFA) bypasses are among the highest-risk policy waivers in secondary enterprise operations. Botnets routinely harvest service account credentials and sweep target subnets for unsecured legacy endpoints.

To mitigate an MFA bypass:
1. Wrap the client in static IP blocks.
2. Require SSH key authentication with rotated passphrases.
3. Configure SIEM dashboards to track concurrent login anomalies.`;
    } else if (q.includes('firewall') || q.includes('port')) {
      text = `Opening inbound routes on primary firewalls allows scanning engines like Shodan or Censys to index exposed service panels in minutes. 

Always enforce peer-to-peer tunnels (VPN) or lock down firewall rules strictly to the specific source CIDR blocks rather than broad \`0.0.0.0/0\` definitions. Combine with intrusion prevention scripts.`;
    } else {
      text = `Welcome to WaiverSentry AI Advisor console. I can analyze risk metrics, draft compensating controls, map policy exceptions directly to ISO 27001, SOC 2, or NIST guidelines, and provide CISO briefing points.

Try asking:
- *"How should we mitigate an MFA bypass?"*
- *"What compliance frameworks overlap with inbound firewall overrides?"*
- Or select any active waiver card inside the registry table to query details!`;
    }
  }

  return text;
}

// ==========================================
// API ENDPOINT: WAIVERS DATABASE CRUD
// ==========================================
import { knex, initDb } from './src/db/knex';
import { seedDatabase } from './src/db/seed';

app.get('/api/waivers', async (req, res) => {
  try {
    const records = await knex('waivers').select('*');
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/waivers', async (req, res) => {
  const records = req.body;
  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'Expected an array of records' });
  }
  try {
    const chunkSize = 50;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await knex('waivers')
        .insert(chunk)
        .onConflict('exception_id')
        .merge(['type', 'requester', 'approver', 'justification', 'start_date', 'end_date', 'status', 'risk_level', 'renewal_count']);
    }
    res.json({ success: true, count: records.length });
  } catch (error: any) {
    console.error('Waiver bulk upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activity_logs', async (req, res) => {
  try {
    const logs = await knex('activity_logs').orderBy('timestamp', 'desc');
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activity_logs', async (req, res) => {
  try {
    const { exception_id, action, user, notes } = req.body;
    await knex('activity_logs').insert({
      exception_id,
      timestamp: new Date().toISOString(),
      action,
      user,
      notes
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

import nodemailer from 'nodemailer';

app.post('/api/alerts/send', async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log('--- MOCK EMAIL SENT ---');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', html);
      console.log('-----------------------');
      return res.json({ success: true, mock: true, message: 'Email sent strictly to console log (SMTP not configured)' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"WaiverSentry" <alerts@waiversentry.com>',
      to,
      subject,
      html,
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: error.message });
  }
});

import PDFDocument from 'pdfkit';
import { Parser } from 'json2csv';

app.get('/api/reports/:format', async (req, res) => {
  const { format } = req.params;
  try {
    const waivers = await knex('waivers').select('*');
    
    // Summary computation
    const total = waivers.length;
    const active = waivers.filter(w => w.status === 'active').length;
    const pending = waivers.filter(w => w.status === 'pending').length;
    const highRisk = waivers.filter(w => w.risk_level === 'CRITICAL' || w.risk_level === 'HIGH').length;

    const summaryText = `Exception Portfolio Summary
---------------------------
Total Exceptions: ${total}
Active Exceptions: ${active}
Pending Assessment: ${pending}
High/Critical Risk: ${highRisk}

Top High Risk:
${waivers.filter(w => w.risk_level === 'CRITICAL').slice(0, 5).map(w => `- [${w.exception_id}] ${w.type}`).join('\n')}

Recommendations:
- Immediately review all ${highRisk} high-risk exceptions.
- Ensure controls are verified for active ones.`;

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="report.json"');
      return res.json({ summary: summaryText, data: waivers });
    }
    
    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', 'attachment; filename="report.txt"');
      return res.send(summaryText);
    }
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
      const json2csvParser = new Parser();
      const csv = json2csvParser.parse(waivers);
      return res.send(csv);
    }
    
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
      const doc = new PDFDocument();
      doc.pipe(res);
      doc.fontSize(20).text('Exception Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(summaryText);
      doc.end();
      return;
    }

    res.status(400).json({ error: 'Unsupported format' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// VITE DEV SERVER & PRODUCTION ASSET HANDLER
// ==========================================

async function startServer() {
  console.log('Syncing database...');
  await initDb();
  await seedDatabase();
  console.log('Database synced.');

  if (process.env.NODE_ENV !== 'production') {
    console.log('Booting with Vite Development Server Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Booting in Standard Production Mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WaiverSentry is securely running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
