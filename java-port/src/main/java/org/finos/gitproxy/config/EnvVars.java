package org.finos.gitproxy.config;

import org.springframework.stereotype.Component;

/**
 * Environment variables used by the GitProxy application.
 * This class provides access to environment variables with default values.
 */
@Component
public class EnvVars {
    /**
     * HTTP port for the Git proxy server.
     */
    public static final int GIT_PROXY_SERVER_PORT = Integer.parseInt(
        System.getenv().getOrDefault("GIT_PROXY_SERVER_PORT", "8000"));
    
    /**
     * HTTPS port for the Git proxy server.
     */
    public static final int GIT_PROXY_HTTPS_SERVER_PORT = Integer.parseInt(
        System.getenv().getOrDefault("GIT_PROXY_HTTPS_SERVER_PORT", "8443"));
    
    /**
     * Port for the GitProxy UI service.
     */
    public static final int GIT_PROXY_UI_PORT = Integer.parseInt(
        System.getenv().getOrDefault("GIT_PROXY_UI_PORT", "3000"));
}
