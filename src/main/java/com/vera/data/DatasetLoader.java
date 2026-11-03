package com.vera.data;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vera.model.ClaimCase;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

@Component
public class DatasetLoader {

    private final ObjectMapper mapper = new ObjectMapper();

    public List<ClaimCase> loadDataset() throws Exception {
        ClassPathResource resource = new ClassPathResource("dataset/claims-dataset.json");
        try (InputStream is = resource.getInputStream()) {
            return mapper.readValue(is,
                    mapper.getTypeFactory().constructCollectionType(List.class, ClaimCase.class));
        }
    }
}
