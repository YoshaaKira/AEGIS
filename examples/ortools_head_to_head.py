"""Call the public AEGIS benchmark endpoint after generating a plan."""
from aegis_sdk import AegisClient

client = AegisClient("http://localhost:8000", "local-dev-key")
plan = client.plan("weather-1")
print(client.benchmark_against_ortools(plan["id"]))
