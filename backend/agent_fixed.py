import os
import json
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import openai
from fastapi import HTTPException
from pydantic import BaseModel
import resend

# Initialize OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Initialize Resend for email
resend.api_key = "re_79wa8DVH_NYxwqcTRmBGQZRRMiFzLHXUm"

# Request/Response models for agent
class AgentRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None  # FIXED: Make optional

class AgentResponse(BaseModel):
    reply: str
    thread_id: str
    actions_performed: List[str] = []

# Mock database for appointments (replace with real database)
appointments_db = []
availability_slots = {
    "2024-01-15": ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"],
    "2024-01-16": ["10:00 AM", "1:00 PM", "3:00 PM"],
    "2024-01-17": ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM", "5:00 PM"],
}

async def book_appointment(args: dict) -> str:
    """Book an appointment"""
    try:
        date = args.get('date')
        time = args.get('time')
        service = args.get('service', 'Consultation')
        client_name = args.get('client_name')
        client_email = args.get('client_email', '')
        
        # Check availability
        if date not in availability_slots:
            return f"Sorry, we don't have availability on {date}. Please choose another date."
        
        if time not in availability_slots[date]:
            available = ", ".join(availability_slots[date])
            return f"Sorry, {time} is not available on {date}. Available times: {available}"
        
        # Book the appointment
        booking_id = f"BK{datetime.now().strftime('%Y%m%d%H%M%S')}"
        appointment = {
            "id": booking_id,
            "date": date,
            "time": time,
            "service": service,
            "client_name": client_name,
            "client_email": client_email,
            "created_at": datetime.now().isoformat()
        }
        
        appointments_db.append(appointment)
        
        # Remove the slot from availability
        availability_slots[date].remove(time)
        
        return f"✅ Appointment booked successfully! Confirmation ID: {booking_id}. {service} scheduled for {date} at {time} for {client_name}. We'll send a confirmation email if provided."
        
    except Exception as e:
        return f"Sorry, I couldn't book the appointment. Error: {str(e)}"

async def send_email(args: dict) -> str:
    """Send an email using Resend.com"""
    try:
        to = args.get('to')
        subject = args.get('subject') 
        message = args.get('message')
        from_email = "Zuccess <onboarding@resend.dev>"  # Use Resend's verified domain
        
        # Validate required fields
        if not to or not subject or not message:
            return "❌ Missing required email fields (to, subject, message)"
        
        # Send email using Resend
        params = {
            "from": from_email,
            "to": [to],
            "subject": subject,
            "html": f"<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>"
                   f"<h2 style='color: #333;'>Message from Zuccess</h2>"
                   f"<div style='background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;'>"
                   f"<p style='line-height: 1.6; color: #555;'>{message.replace(chr(10), '<br>')}</p>"
                   f"</div>"
                   f"<hr style='border: 1px solid #eee; margin: 20px 0;'>"
                   f"<p style='color: #888; font-size: 12px;'>Best regards,<br>Zuccess AI Team<br>Phone: (555) 987-6543</p>"
                   f"</div>"
        }
        
        print(f"📧 SENDING REAL EMAIL via Resend:")
        print(f"From: {from_email}")
        print(f"To: {to}")
        print(f"Subject: {subject}")
        
        # Send the email
        email_response = resend.Emails.send(params)
        print(f"✅ Email sent successfully! ID: {email_response.get('id', 'N/A')}")
        
        return f"✅ Email sent successfully to {to} with subject '{subject}'. Message delivered via Resend."
        
    except Exception as e:
        print(f"❌ Email sending failed: {str(e)}")
        return f"❌ Failed to send email: {str(e)}"

async def check_availability(args: dict) -> str:
    """Check appointment availability"""
    try:
        date = args.get('date')
        
        if date not in availability_slots:
            # Generate some future dates
            future_dates = []
            base_date = datetime.strptime(date, '%Y-%m-%d') if date else datetime.now()
            for i in range(1, 8):
                future_date = (base_date + timedelta(days=i)).strftime('%Y-%m-%d')
                if future_date in availability_slots and availability_slots[future_date]:
                    future_dates.append(future_date)
            
            if future_dates:
                return f"No availability on {date}. Next available dates: {', '.join(future_dates[:3])}"
            else:
                return f"No availability on {date}. Please call (555) 123-4567 to check further dates."
        
        available_slots = availability_slots[date]
        if available_slots:
            return f"✅ Available time slots for {date}: {', '.join(available_slots)}"
        else:
            return f"❌ No available slots on {date}. Please choose another date."
            
    except Exception as e:
        return f"Error checking availability: {str(e)}"

async def search_knowledge(args: dict, collection, embedding_model, synthesize_answer_func) -> str:
    """Search the existing RAG knowledge base"""
    try:
        question = args.get('question', '')
        
        if not collection:
            return "Knowledge system not available. Please contact us at (555) 123-4567."
        
        # Generate embedding for the question
        question_embedding = embedding_model.encode([question]).tolist()[0]
        
        # Query ChromaDB
        results = collection.query(
            query_embeddings=[question_embedding],
            n_results=3
        )
        
        if not results['documents'] or not results['documents'][0]:
            return "I don't have specific information about that. Please contact our office at (555) 123-4567 for more details."
        
        # Use existing synthesis function
        relevant_chunks = results['documents'][0]
        metadatas = results['metadatas'][0] if results['metadatas'] else []
        sources = list(set([meta.get('source', 'Unknown') for meta in metadatas if meta]))
        
        return synthesize_answer_func(question, relevant_chunks, sources)
        
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"

async def get_appointments(args: dict) -> str:
    """Get scheduled appointments"""
    try:
        date = args.get('date', '')
        
        if date:
            # Filter by date
            day_appointments = [apt for apt in appointments_db if apt['date'] == date]
            if day_appointments:
                apt_list = []
                for apt in day_appointments:
                    apt_list.append(f"{apt['time']} - {apt['service']} ({apt['client_name']})")
                return f"Appointments for {date}:\n" + "\n".join(apt_list)
            else:
                return f"No appointments scheduled for {date}"
        else:
            # Show all upcoming appointments
            if appointments_db:
                apt_list = []
                for apt in appointments_db[-5:]:  # Last 5 appointments
                    apt_list.append(f"{apt['date']} at {apt['time']} - {apt['service']} ({apt['client_name']})")
                return "Recent appointments:\n" + "\n".join(apt_list)
            else:
                return "No appointments currently scheduled"
                
    except Exception as e:
        return f"Error retrieving appointments: {str(e)}"

# Function mapping
TOOL_FUNCTIONS = {
    "book_appointment": book_appointment,
    "send_email": send_email,
    "check_availability": check_availability,
    "search_knowledge": search_knowledge,
    "get_appointments": get_appointments,
}

# OpenAI Assistant Tools Definition
ASSISTANT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Book an appointment for a client",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                    "time": {"type": "string", "description": "Time in HH:MM AM/PM format"},
                    "service": {"type": "string", "description": "Type of service (e.g., Consultation, Cloud Migration, AI Solutions)"},
                    "client_name": {"type": "string", "description": "Client's full name"},
                    "client_email": {"type": "string", "description": "Client's email address (optional)"}
                },
                "required": ["date", "time", "service", "client_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_email",
            "description": "Send an email to a recipient",
            "parameters": {
                "type": "object",
                "properties": {
                    "to": {"type": "string", "description": "Recipient email address"},
                    "subject": {"type": "string", "description": "Email subject line"},
                    "message": {"type": "string", "description": "Email content/body"}
                },
                "required": ["to", "subject", "message"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_availability",
            "description": "Check appointment availability for a specific date",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date to check in YYYY-MM-DD format"}
                },
                "required": ["date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge",
            "description": "Search the company knowledge base for information about services, policies, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string", "description": "Question to search in the knowledge base"}
                },
                "required": ["question"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_appointments",
            "description": "Get scheduled appointments, optionally filtered by date",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Date to filter appointments (YYYY-MM-DD format), optional"}
                }
            }
        }
    }
]

async def process_agent_request(request: AgentRequest, collection, embedding_model, synthesize_answer_func) -> AgentResponse:
    """Process agent request with OpenAI function calling"""
    try:
        # Create or get thread
        if request.thread_id:
            thread_id = request.thread_id
        else:
            thread = openai_client.beta.threads.create()
            thread_id = thread.id
        
        # Add user message
        openai_client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=request.message
        )
        
        # Create assistant
        assistant = openai_client.beta.assistants.create(
            name="Zuccess AI Receptionist",
            instructions="""You are a professional AI receptionist for Zuccess, a cutting-edge AI automation company. 

You can help with:
- Booking consultations and checking availability
- Sending emails on behalf of clients  
- Providing information about AI automation services using the knowledge base
- General receptionist duties

Always be professional, friendly, and helpful. When booking appointments, confirm all details clearly.
When clients ask about AI automation services or company information, use the search_knowledge function to provide accurate information.
For complex AI automation questions, suggest they speak with one of our AI specialists.

Company contact: (555) 987-6543 | hello@zuccess.ai""",
            tools=ASSISTANT_TOOLS,
            model="gpt-4-1106-preview"
        )
        
        # Run assistant
        run = openai_client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant.id
        )
        
        # Wait for completion and handle tool calls
        actions_performed = []
        max_iterations = 10
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            # FIXED: Correct API call syntax
            run_status = openai_client.beta.threads.runs.retrieve(
                thread_id=thread_id, 
                run_id=run.id
            )
            
            if run_status.status == 'completed':
                break
            elif run_status.status == 'requires_action':
                tool_calls = run_status.required_action.submit_tool_outputs.tool_calls
                tool_outputs = []
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_args = json.loads(tool_call.function.arguments)
                    
                    # Execute the function
                    if function_name in TOOL_FUNCTIONS:
                        if function_name == "search_knowledge":
                            result = await search_knowledge(function_args, collection, embedding_model, synthesize_answer_func)
                        else:
                            result = await TOOL_FUNCTIONS[function_name](function_args)
                        
                        actions_performed.append(f"{function_name}: {function_args}")
                        
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": result
                        })
                    else:
                        tool_outputs.append({
                            "tool_call_id": tool_call.id,
                            "output": f"Function {function_name} not found"
                        })
                
                # Submit tool outputs
                openai_client.beta.threads.runs.submit_tool_outputs(
                    thread_id=thread_id,
                    run_id=run.id,
                    tool_outputs=tool_outputs
                )
            elif run_status.status in ['failed', 'cancelled', 'expired']:
                raise HTTPException(status_code=500, detail=f"Assistant run failed: {run_status.status}")
            
            # Wait a bit before checking again
            await asyncio.sleep(1)
        
        # Get the assistant's response
        messages = openai_client.beta.threads.messages.list(thread_id)
        assistant_message = messages.data[0]
        reply = assistant_message.content[0].text.value
        
        return AgentResponse(
            reply=reply,
            thread_id=thread_id,
            actions_performed=actions_performed
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent processing error: {str(e)}")