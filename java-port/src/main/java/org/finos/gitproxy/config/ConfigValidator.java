package org.finos.gitproxy.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Set;

/**
 * Validator for GitProxy configuration.
 * This class validates the configuration against a JSON schema.
 */
@Component
public class ConfigValidator {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonSchema schema;

    /**
     * Initializes the validator with the schema.
     */
    public ConfigValidator() {
        try (InputStream schemaStream = getClass().getResourceAsStream("/config.schema.json")) {
            JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V7);
            schema = factory.getSchema(schemaStream);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load schema", e);
        }
    }

    /**
     * Validates a configuration file against the schema.
     *
     * @param configFile the configuration file to validate
     * @return true if the configuration is valid, false otherwise
     * @throws IOException if the file cannot be read
     */
    public boolean validate(File configFile) throws IOException {
        JsonNode jsonNode = objectMapper.readTree(configFile);
        Set<ValidationMessage> validationMessages = schema.validate(jsonNode);
        
        if (!validationMessages.isEmpty()) {
            for (ValidationMessage message : validationMessages) {
                System.err.println(message);
            }
            return false;
        }
        
        return true;
    }
}
