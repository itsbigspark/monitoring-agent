I want to write a project proposal document for an application I want to build

The application I am looking to build is an agentic application that can monitor incident queues (like service now), pick up specific incidents (first focus is specific ones that are raised due to splunk alerts), then proceed to investigate the codebase (with access to code, db, s3, snowflake etc via MCPs or APIs whatever..), idenfity the issue, and propose a fix to the dev team.

This app could scale up to investigate any type of incident, but what I am proposing as an initial offering is an app that can monitor incidents
that have been raised due to splunk alerts, so there are application logs that the app can pull using a splunk mcp, scan through the logs, check the codebase and other systems as required to pull all information necessary, then present a summary of findings (overview, investigation, root cause, proposed fix)

Over time you can look at increasing the scope of the app to investigate other types of incidents that reach the incident queue. Each type of incident to investigate will require connections to relevant data sources etc.. 

What do you propose in terms of tech stack? I am thinking this looks like a good use case for an agent app using langgraph or langchain or whatever agent sdk is most appropriate.

I was inspired to build this because in my client work at a bank, I have setup a splunk MCP that I wrote myself, then anytime we get an app incident due to splunk, they ask me to investigate it, i generally then just open up Kiro and ask it to check splunk for this app name in this index in this time window and pull all relevant logs, it can then check the code base that I have locally. I am thinking this could be a great thing to build and deploy at clients. I just want to brainstorm this with you