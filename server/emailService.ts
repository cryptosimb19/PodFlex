import { MailService } from '@sendgrid/mail';

let mailService: MailService | null = null;

if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid email service initialized');
} else {
  console.log('SendGrid API key not found - email notifications disabled');
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mailService) {
    console.log('Email service not available - skipping email to', params.to);
    return false;
  }
  
  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await mailService.send(emailData);
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Template for join request notification
export async function sendJoinRequestNotification(
  podLeaderEmail: string,
  podTitle: string,
  applicantName: string,
  applicantEmail: string,
  fromEmail: string
): Promise<boolean> {
  const subject = `New Join Request for ${podTitle} - FlexPod`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">FlexPod</h1>
        <p style="color: white; margin: 5px 0;">New Join Request</p>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Someone wants to join your pod!</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #8B5CF6;">
          <h3 style="color: #8B5CF6; margin-top: 0;">Pod: ${podTitle}</h3>
          <p style="color: #4b5563; margin: 10px 0;"><strong>Applicant:</strong> ${applicantName}</p>
          <p style="color: #4b5563; margin: 10px 0;"><strong>Email:</strong> ${applicantEmail}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/pod-leader-dashboard" 
             style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Review Request
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Log into your FlexPod dashboard to review this request and contact the applicant directly.
        </p>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>This email was sent by FlexPod because you're a pod leader.</p>
      </div>
    </div>
  `;

  const text = `
    New Join Request - FlexPod
    
    Someone wants to join your pod: ${podTitle}
    
    Applicant: ${applicantName}
    Email: ${applicantEmail}
    
    Log into your FlexPod dashboard to review this request.
  `;

  return await sendEmail({
    to: podLeaderEmail,
    from: fromEmail,
    subject,
    html,
    text
  });
}