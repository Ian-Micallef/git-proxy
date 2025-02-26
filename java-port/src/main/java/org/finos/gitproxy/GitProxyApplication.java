package org.finos.gitproxy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main application class for GitProxy.
 * This is the entry point for the Java port of the GitProxy application.
 */
@SpringBootApplication
public class GitProxyApplication {
    
    /**
     * Main method to start the GitProxy application.
     * 
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        SpringApplication.run(GitProxyApplication.class, args);
    }
}
