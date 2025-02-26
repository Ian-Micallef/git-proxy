package org.finos.gitproxy.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Configuration class for GitProxy.
 * This class maps the configuration properties from the proxy.config.json file.
 */
@Configuration
@ConfigurationProperties(prefix = "git-proxy")
@Data
public class GitProxyConfig {
    private String proxyUrl;
    private String cookieSecret;
    private int sessionMaxAgeHours;
    private JsonNode api;
    private JsonNode commitConfig;
    private JsonNode attestationConfig;
    private JsonNode domains;
    private List<String> privateOrganizations = new ArrayList<>();
    private String urlShortener;
    private String contactEmail;
    private boolean csrfProtection;
    private List<String> plugins = new ArrayList<>();
    private List<AuthorisedRepo> authorisedList = new ArrayList<>();
    private List<Database> sink = new ArrayList<>();
    private List<Authentication> authentication = new ArrayList<>();
    private TempPassword tempPassword;
    
    private String configFile = "proxy.config.json";
    
    /**
     * Validates the configuration file.
     * 
     * @throws IOException if the file doesn't exist or is invalid
     */
    public void validate() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        File file = new File(configFile);
        if (!file.exists()) {
            throw new IOException("Config file " + configFile + " doesn't exist");
        }
        
        // Load and validate the config file
        mapper.readTree(file);
        System.out.println(configFile + " is valid");
    }
    
    /**
     * Gets the path to the SSL key file.
     * 
     * @return the path to the SSL key file
     */
    public String getSSLKeyPath() {
        return "../certs/key.pem";
    }
    
    /**
     * Gets the path to the SSL certificate file.
     * 
     * @return the path to the SSL certificate file
     */
    public String getSSLCertPath() {
        return "../certs/cert.pem";
    }
    
    /**
     * Represents an authorized repository.
     */
    @Data
    public static class AuthorisedRepo {
        private String project;
        private String name;
        private String url;
    }
    
    /**
     * Represents a database configuration.
     */
    @Data
    public static class Database {
        private String type;
        private boolean enabled;
        private String connectionString;
        private JsonNode options;
        private JsonNode params;
    }
    
    /**
     * Represents an authentication configuration.
     */
    @Data
    public static class Authentication {
        private String type;
        private boolean enabled;
        private JsonNode options;
    }
    
    /**
     * Represents temporary password configuration.
     */
    @Data
    public static class TempPassword {
        private boolean sendEmail;
        private JsonNode emailConfig;
    }
}
