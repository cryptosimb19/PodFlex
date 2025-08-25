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

// Template for join request accepted notification
export async function sendJoinRequestAcceptedNotification(
  applicantEmail: string,
  applicantName: string,
  podTitle: string,
  podLeaderName: string,
  fromEmail: string
): Promise<boolean> {
  const subject = `🎉 Welcome to ${podTitle} - FlexPod`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">FlexPod</h1>
        <p style="color: white; margin: 5px 0;">🎉 Request Accepted!</p>
      </div>
      
      <div style="padding: 30px; background: #f0fdf4;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Congratulations ${applicantName}!</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #10B981;">
          <h3 style="color: #10B981; margin-top: 0;">You've been accepted to: ${podTitle}</h3>
          <p style="color: #4b5563; margin: 10px 0;"><strong>Pod Leader:</strong> ${podLeaderName}</p>
          <p style="color: #4b5563; margin: 10px 0;">You can now enjoy shared Bay Club access with this pod!</p>
        </div>
        
        <div style="background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="color: #059669; margin: 0 0 10px 0;">Next Steps:</h4>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
            <li>Check your dashboard for pod member contact details</li>
            <li>Coordinate payment arrangements with your pod leader</li>
            <li>Start enjoying your shared Bay Club membership!</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/dashboard" 
             style="background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View My Dashboard
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Welcome to the FlexPod community! Enjoy your shared membership.</p>
      </div>
    </div>
  `;

  const text = `
    🎉 Request Accepted - FlexPod
    
    Congratulations ${applicantName}!
    
    You've been accepted to: ${podTitle}
    Pod Leader: ${podLeaderName}
    
    Next Steps:
    - Check your dashboard for member contact details
    - Coordinate payment with your pod leader
    - Start enjoying your shared Bay Club membership!
    
    Log into your FlexPod dashboard to get started.
  `;

  return await sendEmail({
    to: applicantEmail,
    from: fromEmail,
    subject,
    html,
    text
  });
}

// Template for join request rejected notification
export async function sendJoinRequestRejectedNotification(
  applicantEmail: string,
  applicantName: string,
  podTitle: string,
  fromEmail: string
): Promise<boolean> {
  const subject = `Update on ${podTitle} Request - FlexPod`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">FlexPod</h1>
        <p style="color: white; margin: 5px 0;">Request Update</p>
      </div>
      
      <div style="padding: 30px; background: #f9fafb;">
        <h2 style="color: #1f2937; margin-bottom: 20px;">Hi ${applicantName},</h2>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
          <p style="color: #4b5563; margin: 0;">Unfortunately, your request to join <strong>${podTitle}</strong> was not accepted this time. This could be due to the pod being full or the leader finding a better fit.</p>
        </div>
        
        <div style="background: #fffbeb; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4 style="color: #d97706; margin: 0 0 10px 0;">Don't give up! Here's what you can do:</h4>
          <ul style="color: #4b5563; margin: 0; padding-left: 20px;">
            <li>Browse other available pods in your area</li>
            <li>Create your own pod and become a leader</li>
            <li>Set up alerts for new pods that match your preferences</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/pods" 
             style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Browse Other Pods
          </a>
        </div>
      </div>
      
      <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
        <p>Keep looking - your perfect pod match is out there!</p>
      </div>
    </div>
  `;

  const text = `
    Request Update - FlexPod
    
    Hi ${applicantName},
    
    Unfortunately, your request to join ${podTitle} was not accepted this time.
    
    Don't give up! You can:
    - Browse other available pods in your area
    - Create your own pod and become a leader
    - Set up alerts for new pods
    
    Visit FlexPod to continue your search.
  `;

  return await sendEmail({
    to: applicantEmail,
    from: fromEmail,
    subject,
    html,
    text
  });
}