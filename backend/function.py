import functions_framework
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from google.cloud import firestore

# Initialize Vertex AI & Firestore Client
# This happens once when the function instance starts
PROJECT_ID = "your-gcp-project-id"  # @param {type:"string"}
LOCATION = "us-central1"           # @param {type:"string"}
vertexai.init(project=PROJECT_ID, location=LOCATION)
db = firestore.Client()

# Define the Gemini model to be used
model = GenerativeModel("gemini-1.5-pro-001")

@functions_framework.cloud_event
def analyze_pitch_deck(cloud_event):
    """
    This function is triggered by a file upload to a Cloud Storage bucket.
    It analyzes the pitch deck using Gemini and saves the results to Firestore.
    """
    data = cloud_event.data
    bucket = data["bucket"]
    file_name = data["name"]
    gcs_uri = f"gs://{bucket}/{file_name}"

    print(f"Processing file: {file_name}")

    # Use Gemini 1.5 Pro's multimodal capabilities to process the PDF directly
    pdf_file = Part.from_uri(gcs_uri, mime_type="application/pdf")

    # --- Feature 2 & 3: Structured Data Extraction & Red Flag Analysis ---
    # A single, powerful prompt to get structured data and identify risks
    prompt_extract_and_flag = """
    You are an AI analyst for a Venture Capital firm. Analyze the provided pitch deck.
    1.  Extract the following key information into a JSON object:
        - startup_name: The name of the startup.
        - problem: The core problem the startup is solving.
        - solution: The startup's proposed solution.
        - team_summary: A brief summary of the founding team's background and expertise.
        - market_size_tam: Total Addressable Market (TAM).
        - business_model: How the startup makes money.
        - traction: Key metrics showing current progress (e.g., users, revenue).
        - competition: Who are the main competitors.

    2.  Based on the content, identify potential investment red flags. Red flags could include:
        - Unclear or unconvincing business model.
        - Overly inflated or poorly researched market size (TAM).
        - Lack of relevant experience on the founding team.
        - Weak competitive analysis or claims of "no competition".
        - Inconsistent metrics or vanity metrics.
        List these as an array of strings under a "red_flags" key in the JSON.
        
    Provide ONLY the JSON object as your response.
    """
    
    # --- Feature 4: SWOT Analysis ---
    prompt_swot = """
    Based on the same pitch deck, generate a concise SWOT analysis (Strengths, Weaknesses, Opportunities, Threats).
    Present this as a JSON object with four keys: "strengths", "weaknesses", "opportunities", and "threats". Each key should contain an array of strings.
    Provide ONLY the JSON object as your response.
    """

    try:
        # Generate the structured data and red flags
        response_extract = model.generate_content([pdf_file, prompt_extract_and_flag])
        
        # Generate the SWOT analysis
        response_swot = model.generate_content([pdf_file, prompt_swot])

        # Combine the results into a single dictionary
        # We'll clean up the text which might be in a markdown block
        import json
        
        analysis_data = json.loads(response_extract.text.strip('```json\n'))
        swot_data = json.loads(response_swot.text.strip('```json\n'))
        
        final_report = {
            "startup_info": analysis_data,
            "swot_analysis": swot_data,
            "status": "completed",
            "file_name": file_name
        }

        # Save the result to Firestore
        # The document ID could be the file name or a unique ID
        doc_ref = db.collection("evaluations").document(file_name)
        doc_ref.set(final_report)
        print(f"Successfully saved analysis for {file_name} to Firestore.")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Optionally, update Firestore with an error status
        doc_ref = db.collection("evaluations").document(file_name)
        doc_ref.set({"status": "error", "error_message": str(e), "file_name": file_name})