# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

class SentiMint(gl.Contract):
    nfts: TreeMap[str, str]
    total_mints: u256

    def __init__(self):
        self.total_mints = u256(0)

    @gl.public.write
    def mint_city_nft(self, city_name: str) -> str:
        nft_id = str(self.total_mints)
        
        # Initial state before weather data is pulled
        nft_data = {
            "id": nft_id,
            "city": city_name,
            "mood": "UNINITIALIZED",
            "temperature": "UNKNOWN",
            "last_updated": "never"
        }
        
        self.nfts[nft_id] = json.dumps(nft_data)
        self.total_mints += u256(1)
        
        return nft_id

    @gl.public.write
    def sync_real_world_data(self, nft_id: str) -> str:
        data_str = self.nfts.get(nft_id)
        if data_str is None:
            return json.dumps({"status": "ERROR", "message": "NFT not found"})
            
        nft_data = json.loads(data_str)
        city = nft_data["city"]
        
        # Replace spaces with plus for URL
        formatted_city = city.replace(" ", "+")
        url = f"https://wttr.in/{formatted_city}?format=%C+%t"

        def _fetch_weather() -> str:
            try:
                response = gl.nondet.web.get(url)
                text = response.body.decode("utf-8")
                return text[:100] # Usually very short: "Clear +15°C"
            except Exception:
                return "ERROR_FETCHING"
                
        try:
            weather_raw = gl.eq_principle.strict_eq(_fetch_weather)
        except Exception:
            weather_raw = "ERROR_FETCHING"
            
        if weather_raw == "ERROR_FETCHING" or "404" in weather_raw or "Error" in weather_raw:
            return json.dumps({"status": "WARNING", "message": f"Could not fetch live weather data for {city}."})

        # We use a highly constrained prompt to ensure the AI assigns a strict "Mood" category
        prompt = f"""
        Weather string: {weather_raw}
        
        Task: Based on the weather above, determine the 'Mood' of the city. 
        You must answer with EXACTLY ONE WORD from this list: SUNNY, CLOUDY, RAINY, SNOWY, MISTY, or NIGHT.
        If it says 'Clear', choose SUNNY. If it has rain/drizzle, choose RAINY. 
        Answer with ONE WORD only.
        """
        
        def _analyze_mood() -> str:
            return gl.nondet.exec_prompt(prompt)
            
        try:
            # We use strict_eq because the prompt forces a single word binary answer.
            mood_result = gl.eq_principle.strict_eq(_analyze_mood)
        except Exception:
            mood_result = "UNKNOWN"
            
        # Clean up the output
        mood_result = mood_result.upper().strip()
        
        # Update the NFT state autonomously based on the AI Oracle's consensus
        nft_data["mood"] = mood_result
        nft_data["temperature"] = weather_raw
        nft_data["last_updated"] = "auto-synced"
        
        updated_json = json.dumps(nft_data)
        self.nfts[nft_id] = updated_json
        
        return updated_json

    @gl.public.view
    def get_nft(self, nft_id: str) -> str:
        data = self.nfts.get(nft_id)
        if data is None:
            return "NOT_FOUND"
        return data

    @gl.public.view
    def get_total_mints(self) -> str:
        return str(self.total_mints)
